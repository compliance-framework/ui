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
  toValue,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  ConfigDoc,
  ConfigPreview,
  OverlayDoc,
  SaveResult,
} from '@/types/agent-config';
import { usePermissions } from '@/composables/usePermissions';
import { instanceErrorsBlock } from '@/components/agents/config/editor/review';
import { clone, deepEqual } from '@/utils/agent-config/merge-patch';
import { useUserStore } from '@/stores/auth';
import { hasBlocking, type ClientIssue } from '@/utils/agent-config/validation';
import {
  addPluginAccess,
  fieldAccess,
  type AccessContext,
  type FieldAccess,
} from '@/utils/agent-config/field-access';
import type { AgentConfigApi } from './api-types';
import type { AgentConfigState } from './useAgentConfig';
import { agentDraftState, syncDraftState } from './draftRegistry';
import { useOverlayDraft, type DraftState } from './useOverlayDraft';
import { usePreview } from './usePreview';
import {
  EDITOR_CONTEXT_KEY,
  OVERLAY_DRAFT_KEY,
  type EditorContext,
} from './editorContext';

/** A writable ref that reads and writes whichever ref `target` currently returns. */
function proxyRef<T>(target: () => Ref<T>): Ref<T> {
  return computed({
    get: () => target().value,
    set: (v) => {
      target().value = v;
    },
  });
}

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
  /** The agent (a string, ref or getter): API calls and the draft follow its current value. */
  agentId: MaybeRefOrGetter<string>,
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
  // Scoped to the signed-in user (see draftRegistry). A different agent id swaps the state
  // the draft refs point at (one DraftState per agent); only a config load syncs it, so a
  // new agent's draft is never initialised from the previous agent's still-loaded config.
  const userKey = useUserStore().user?.id ?? '';
  const agentIdRef = computed(() => toValue(agentId));
  const registryState = computed(() =>
    agentDraftState(agentIdRef.value, userKey),
  );
  const draftState: DraftState = {
    baseRevision: proxyRef(() => registryState.value.baseRevision),
    original: proxyRef(() => registryState.value.original),
    overlay: proxyRef(() => registryState.value.overlay),
    comment: proxyRef(() => registryState.value.comment),
  };
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
      const blocks = instanceErrorsBlock(inst);
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

  // ---- R71: per-field access over the reporting instances (field-access.ts) ----
  // Instance bases tell which plugins and sources each host's file has (a plugin the draft
  // adds applies only where its source is accepted); the draft overlay supplies that source.
  const accessContext = computed<AccessContext>(() => ({
    instances: state.instances.value,
    bases: new Map(
      Array.from(instanceDetails.value, ([id, d]) => [id, d.base] as const),
    ),
    overlay: draft.overlay.value,
  }));
  /** Whether the reporting instances would apply a change at `ptr` (three states). */
  function accessAt(ptr: string): FieldAccess {
    return fieldAccess(ptr, accessContext.value);
  }
  /** Whether they would install a new plugin (with `source`, once known). */
  function addPluginAccessFor(source?: string): FieldAccess {
    return addPluginAccess(accessContext.value, source);
  }

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
    currentPreview,
    accessAt,
  };

  /**
   * Whether this user may edit the field at `ptr` (R40): never a forbidden key, nor a field
   * no reporting instance would apply (R71 read-only).
   */
  function canEditPointer(ptr: string): boolean {
    if (!canConfigure.value) return false;
    const state = accessAt(ptr).state;
    return state !== 'forbidden' && state !== 'readonly';
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

  /**
   * After a save: the saved overlay becomes the base, then everything reloads. `sent` is the
   * overlay the save sent: when the draft has moved on since, only the base moves and the
   * newer edits stay pending.
   */
  async function onSaved(result: SaveResult, sent?: OverlayDoc): Promise<void> {
    const saved = {
      ...result.revision,
      overlay: result.revision.overlay ?? sent ?? draft.overlay.value,
    };
    if (!sent || deepEqual(draft.overlay.value, sent)) {
      syncDraftState(draftState, saved, true);
    } else {
      draftState.baseRevision.value = saved.revision;
      draftState.original.value = clone(saved.overlay);
      draftState.comment.value = '';
    }
    await state.refresh();
  }

  /** Drops the pending changes, and catches up with a newer desired revision. */
  function discard(): void {
    draft.discard();
    if (state.config.value) syncDraftState(draftState, state.config.value);
  }

  const workspace = {
    agentId: agentIdRef,
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
    accessAt,
    addPluginAccess: addPluginAccessFor,
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
