// The editing workspace of one agent (R69): the shared pending-changes draft, the instance
// bases it is shown against, the live preview and the permission rules, provided to the
// Effective view (inline pencils), the raw YAML dialog, the pending-changes bar and the review
// dialog. Created by the Configuration tab; the draft is per agent (draftRegistry).

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
  SaveResult,
} from '@/types/agent-config';
import { usePermissions } from '@/composables/usePermissions';
import { useUserStore } from '@/stores/auth';
import { hasBlocking, type ClientIssue } from '@/utils/agent-config/validation';
import { isForbiddenPointer } from '@/utils/agent-config/field-access';
import type { AgentConfigApi } from './api-types';
import type { AgentConfigState } from './useAgentConfig';
import { agentDraftState, syncDraftState } from './draftRegistry';
import { useOverlayDraft } from './useOverlayDraft';
import { usePreview } from './usePreview';
import {
  EDITOR_CONTEXT_KEY,
  OVERLAY_DRAFT_KEY,
  type EditorContext,
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

export function useConfigWorkspace(
  agentId: string,
  api: AgentConfigApi,
  state: AgentConfigState,
) {
  const { can, RESOURCES, ACTIONS } = usePermissions();
  const canConfigure = computed(() => can(RESOURCES.AGENT, ACTIONS.CONFIGURE));

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

  const draft = useOverlayDraft(draftState, placeholderBase, {
    bases,
    extraIssues: () => previewIssues.value,
  });

  // ---- Live preview (debounced; only for a dirty draft without client-only blockers) ----
  // R89: the preview is the UI's validation. Its errors gate Review & save.
  const clientBlocked = computed(() => hasBlocking(draft.clientIssues.value));
  const agentIdRef = computed(() => agentId);
  const canPreview = computed(
    () =>
      canConfigure.value &&
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
  const blockingCount = computed(
    () => draft.issues.value.filter((i) => i.blocking).length,
  );

  const config = computed(() => state.config.value ?? EMPTY_REVISION);
  const ctx: EditorContext = {
    agentId: agentIdRef,
    config,
    instances: state.instances,
    instanceDetails,
    placeholderInstanceId,
    placeholderBase,
    bases,
    lastPreview: preview.lastPreview,
  };

  /** Whether this user may edit the field at `ptr` (R40); forbidden keys never. */
  function canEditPointer(ptr: string): boolean {
    return canConfigure.value && !isForbiddenPointer(ptr);
  }

  /** '' = the user may save this draft; else why not (R40). */
  const saveDisabledReason = computed(() =>
    canConfigure.value
      ? ''
      : "You don't have permission to change this configuration",
  );

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
    draft,
    instanceDetails,
    detailsLoading,
    detailsLoaded,
    loadDetails,
    placeholderInstanceId,
    placeholderBase,
    bases,
    preview,
    clientBlocked,
    blockingCount,
    ctx,
    canEditPointer,
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
