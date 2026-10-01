// The editing workspace of one agent (R69): the shared pending-changes draft, the instance
// bases it is validated against, the live preview and the permission rules, provided to the
// Effective view (inline pencils), the Policies view, the pending-changes bar and the review
// dialog. Created by the Configuration tab and by the Policies view; both bind to the same
// per-agent draft (draftRegistry), so their edits are saved together as one revision.

import {
  computed,
  inject,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
} from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  ConfigDoc,
  ConfigPreview,
  PolicyBundleDoc,
  PolicyError,
  SaveResult,
} from '@/types/agent-config';
import { usePermissions } from '@/composables/usePermissions';
import { useUserStore } from '@/stores/auth';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { parsePointer } from '@/utils/agent-config/json-pointer';
import {
  hasBlocking,
  type ClientIssue,
  type ValidationContext,
} from '@/utils/agent-config/validation';
import {
  isPolicyOnlyChange,
  vendorFilesFor,
} from '@/utils/agent-config/policy-files';
import { isForbiddenPointer } from '@/utils/agent-config/field-access';
import { validationInstanceIds } from '@/utils/agent-config/instance-status';
import type { AgentConfigApi } from './api-types';
import type { AgentConfigState } from './useAgentConfig';
import { agentDraftState, syncDraftState } from './draftRegistry';
import { useOverlayDraft } from './useOverlayDraft';
import { usePreview } from './usePreview';
import {
  EDITOR_CONTEXT_KEY,
  EDITOR_PERMISSIONS_KEY,
  OVERLAY_DRAFT_KEY,
  type EditorContext,
  type EditorMode,
} from './editorContext';

const EMPTY_REVISION: AgentConfigRevision = {
  agentId: '',
  revision: 0,
  overlay: {},
  overlaySize: 2,
  comment: null,
  createdBy: null,
  createdAt: null,
  revertOf: null,
};

/** Paths a configure-policy-only user may change (D18/R22): bundles and policy lists. */
export function isPolicyPointer(ptr: string): boolean {
  const t = parsePointer(ptr);
  if (t[0] === 'policy_bundles') return true;
  return t.length === 3 && t[0] === 'plugins' && t[2] === 'policies';
}

export function useConfigWorkspace(
  agentId: string,
  api: AgentConfigApi,
  state: AgentConfigState,
) {
  const { can, RESOURCES, ACTIONS } = usePermissions();
  const canConfigure = computed(() => can(RESOURCES.AGENT, ACTIONS.CONFIGURE));
  const canConfigurePolicy = computed(() =>
    can(RESOURCES.AGENT, ACTIONS.CONFIGURE_POLICY),
  );
  const canEdit = computed(
    () => canConfigure.value || canConfigurePolicy.value,
  );
  const editorMode = computed<EditorMode>(() =>
    canConfigure.value ? 'full' : 'policy-only',
  );

  // ---- Instance details (bases + reports): every reported instance, loaded on demand ----
  const loadedDetails = shallowRef(new Map<string, AgentInstanceDetail>());
  const detailsLoading = ref(false);
  const detailsLoaded = ref(false);
  let detailsSeq = 0;
  async function loadDetails(): Promise<void> {
    const seq = ++detailsSeq;
    detailsLoading.value = true;
    try {
      const m = await state.loadAllInstanceDetails();
      if (seq !== detailsSeq) return;
      loadedDetails.value = m;
      detailsLoaded.value = true;
    } finally {
      if (seq === detailsSeq) detailsLoading.value = false;
    }
  }
  // A refresh re-reads the instance list: the loaded details may be stale.
  watch(state.instances, () => {
    if (detailsLoaded.value || detailsLoading.value) loadDetails();
  });

  /** Loaded details plus the selected instance's (fresh) detail. */
  const instanceDetails = computed(() => {
    const m = new Map(loadedDetails.value);
    const sel = state.selectedInstance.value;
    if (sel && state.selectedInstanceCurrent.value) m.set(sel.instanceId, sel);
    return m;
  });
  const placeholderInstanceId = computed<string | null>(() => {
    const sel = state.selectedInstanceId.value;
    if (sel && instanceDetails.value.get(sel)?.base) return sel;
    return (
      Array.from(instanceDetails.value.values()).find((d) => d.base)
        ?.instanceId ?? sel
    );
  });
  const placeholderDetail = computed(() =>
    placeholderInstanceId.value
      ? (instanceDetails.value.get(placeholderInstanceId.value) ?? null)
      : null,
  );
  const placeholderBase = computed<ConfigDoc | null>(
    () => placeholderDetail.value?.base ?? null,
  );
  const bases = computed<ConfigDoc[]>(() =>
    Array.from(instanceDetails.value.values())
      .map((d) => d.base)
      .filter((b): b is ConfigDoc => !!b),
  );
  // The API validates a save against these instances only (R48); mirror it client-side.
  const validationBases = computed<ConfigDoc[]>(() =>
    validationInstanceIds(state.instances.value)
      .map((id) => instanceDetails.value.get(id)?.base)
      .filter((b): b is ConfigDoc => !!b),
  );
  /** Every loaded instance's policy bundle reports, the placeholder's first (R62). */
  const reportSets = computed(() => {
    const first = placeholderDetail.value;
    const rest = Array.from(instanceDetails.value.values()).filter(
      (d) => d !== first,
    );
    return [first, ...rest]
      .filter((d): d is AgentInstanceDetail => !!d)
      .map((d) => d.policyBundles ?? null);
  });

  // ---- The draft (shared per agent) ----
  // Scoped to the signed-in user (see draftRegistry).
  const draftState = agentDraftState(agentId, useUserStore().user?.id ?? '');
  watch(
    state.config,
    (cfg) => {
      if (cfg) syncDraftState(draftState, cfg);
    },
    { immediate: true },
  );
  const ready = computed(() => draftState.baseRevision.value >= 0);

  const validationContext = computed<ValidationContext>(() => ({
    vendorPackages: (bundle: string) => {
      const b = draft.effectiveDraft.value.policy_bundles?.[bundle];
      const files = vendorFilesFor(
        bundle,
        isPlainObject(b) ? (b as PolicyBundleDoc) : null,
        placeholderDetail.value?.policyBundles ?? null,
      );
      return files
        ? files.map((f) => f.package).filter((p): p is string => !!p)
        : null;
    },
  }));
  const draft = useOverlayDraft(draftState, placeholderBase, {
    bases,
    validationBases,
    validationContext,
    extraIssues: () => previewIssues.value,
  });

  // ---- Live preview (debounced; only for a dirty draft without client-only blockers) ----
  // R89: the preview is the UI's validation. Its errors gate Review & save.
  const clientBlocked = computed(() => hasBlocking(draft.clientIssues.value));
  const agentIdRef = computed(() => agentId);
  const canPreview = computed(
    () =>
      canEdit.value &&
      ready.value &&
      draft.isDirty.value &&
      !clientBlocked.value &&
      !detailsLoading.value,
  );
  const preview = usePreview(agentIdRef, draft.overlay, api, canPreview);
  /** The last preview, while it still describes the draft. */
  const currentPreview = computed<ConfigPreview | null>(() =>
    preview.isCurrent() ? preview.lastPreview.value : null,
  );
  /** The preview's overlay and per-instance problems, as issues at their pointers (R59). */
  const previewIssues = computed<ClientIssue[]>(() => {
    const p = currentPreview.value;
    if (!p) return [];
    const out: ClientIssue[] = p.overlayErrors.map((e) => ({
      ptr: e.path,
      message: e.message,
      blocking: true,
    }));
    const many = p.instances.length > 1;
    for (const inst of p.instances) {
      const on = many && inst.hostname ? ` (on ${inst.hostname})` : '';
      // R48: only validated instances block; older APIs lack `validated` (fresh ones block).
      const blocks = inst.validated ?? !inst.stale;
      for (const e of inst.errors)
        out.push({ ptr: e.path, message: e.message + on, blocking: blocks });
      for (const e of inst.warnings ?? [])
        out.push({
          ptr: e.path,
          message: `${e.message} (already in the agent's file)${on}`,
          blocking: false,
        });
    }
    return out;
  });
  /** Error-severity policy problems of the current preview (shown per module). */
  const previewPolicyErrors = computed(
    () =>
      currentPreview.value?.policyErrors.filter(
        (e) => e.severity === 'error',
      ) ?? [],
  );
  const blockingCount = computed(
    () =>
      draft.issues.value.filter((i) => i.blocking).length +
      previewPolicyErrors.value.length,
  );
  /** Policy errors from the last failed save (422), for Rego diagnostics. */
  const savePolicyErrors = ref<PolicyError[]>([]);
  watch(draft.overlay, () => {
    savePolicyErrors.value = [];
  });

  const config = computed(() => state.config.value ?? EMPTY_REVISION);
  const ctx: EditorContext = {
    agentId: agentIdRef,
    config,
    instances: state.instances,
    instanceDetails,
    placeholderInstanceId,
    placeholderBase,
    bases,
    validationBases,
    lastPreview: preview.lastPreview,
    savePolicyErrors,
  };

  /** Whether this user may edit the field at `ptr` (R40/R58/R61); forbidden keys never. */
  function canEditPointer(ptr: string): boolean {
    if (isForbiddenPointer(ptr)) return false;
    if (canConfigure.value) return true;
    return canConfigurePolicy.value && isPolicyPointer(ptr);
  }

  /**
   * The bases a save validates against (R48): the previewed `validated` instances when known,
   * else fresh apply-mode instances. For the advisory policy-only check (the API decides).
   */
  const policyBases = computed<ConfigDoc[]>(() => {
    const p = preview.lastPreview.value;
    if (p && p.instances.some((i) => i.validated !== undefined)) {
      return p.instances
        .filter((i) => i.validated)
        .map((i) => instanceDetails.value.get(i.instanceId)?.base)
        .filter((b): b is ConfigDoc => !!b);
    }
    return validationBases.value;
  });
  /** '' = the user may save this draft; else why not (R58/R61, mirrors PolicyOnlyChange). */
  const saveDisabledReason = computed(() => {
    if (!canEdit.value)
      return "You don't have permission to change this configuration";
    if (editorMode.value === 'full') return '';
    return isPolicyOnlyChange(
      policyBases.value,
      draft.original.value,
      draft.overlay.value,
    )
      ? ''
      : 'Your role can only change policy bundles and inline references';
  });

  /** '' = Review & save is enabled; else why not (R89: never ahead of a pending preview). */
  const reviewDisabledReason = computed(() => {
    if (blockingCount.value) return 'Fix the problems first';
    if (preview.pending.value) return 'Checking the pending changes…';
    return saveDisabledReason.value;
  });

  const reviewOpen = ref(false);
  function openReview(): void {
    if (!draft.isDirty.value) return;
    reviewOpen.value = true;
  }

  /** After a save: the saved overlay becomes the base, then everything reloads. */
  async function onSaved(result: SaveResult): Promise<void> {
    syncDraftState(
      draftState,
      {
        ...result.revision,
        overlay: result.revision.overlay ?? draft.overlay.value,
      },
      true,
    );
    savePolicyErrors.value = [];
    await state.refresh();
  }

  /** Drops the pending changes, and catches up with a newer desired revision. */
  function discard(): void {
    draft.discard();
    if (state.config.value) syncDraftState(draftState, state.config.value);
  }

  const workspace = {
    agentId,
    api,
    state,
    ready,
    canConfigure,
    canConfigurePolicy,
    canEdit,
    editorMode,
    draft,
    instanceDetails,
    detailsLoading,
    detailsLoaded,
    loadDetails,
    placeholderInstanceId,
    placeholderDetail,
    placeholderBase,
    bases,
    validationBases,
    reportSets,
    preview,
    savePolicyErrors,
    clientBlocked,
    previewPolicyErrors,
    blockingCount,
    ctx,
    canEditPointer,
    policyBases,
    saveDisabledReason,
    reviewDisabledReason,
    reviewOpen,
    openReview,
    onSaved,
    discard,
  };

  provide(WORKSPACE_KEY, workspace);
  provide(OVERLAY_DRAFT_KEY, draft);
  provide(EDITOR_CONTEXT_KEY, ctx);
  provide(EDITOR_PERMISSIONS_KEY, { mode: editorMode });
  return workspace;
}

export type ConfigWorkspace = ReturnType<typeof useConfigWorkspace>;

export const WORKSPACE_KEY: InjectionKey<ConfigWorkspace> = Symbol(
  'agent-config-workspace',
);

/** The provided workspace, or null in read-only contexts (no editing UI). */
export function useWorkspace(): ConfigWorkspace | null {
  return inject(WORKSPACE_KEY, null);
}
