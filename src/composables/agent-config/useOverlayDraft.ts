// The pending-changes draft (R69): ONE overlay document per agent, edited from the Effective
// view (inline pencils) and the raw YAML dialog, and saved as one revision. The state lives in
// the per-agent registry (./draftRegistry) so it survives the Configuration tab being remounted;
// this composable adds the operations and the derived views (effective draft, changed paths,
// issues) for one component tree.
//
// Draft semantics: clearing a field omits the key (the file value applies again); there is no
// automatic normalisation of overlay values equal to the base, because bases differ between
// instances and dropping a key could silently un-pin it elsewhere (the API's R14 no-op check
// covers accidental "no change" saves).

import {
  computed,
  isRef,
  ref,
  shallowRef,
  type Ref,
  type ShallowRef,
} from 'vue';
import type {
  AgentConfigRevision,
  ConfigDoc,
  OverlayDoc,
} from '@/types/agent-config';
import { clone, deepEqual, mergePatch } from '@/utils/agent-config/merge-patch';
import { nullAt, setAt, unsetAt } from '@/utils/agent-config/overlay-ops';
import { getAt, hasAt, isPrefix } from '@/utils/agent-config/json-pointer';
import { changedLeafPaths } from '@/utils/agent-config/config-diff';
import {
  validateOverlayClientSide,
  type ClientIssue,
} from '@/utils/agent-config/validation';

/** The shared, per-agent draft state. `baseRevision` -1 = not initialised yet. */
export interface DraftState {
  baseRevision: Ref<number>;
  /** Overlay of `baseRevision` (what is saved). */
  original: ShallowRef<OverlayDoc>;
  /** The draft overlay. */
  overlay: ShallowRef<OverlayDoc>;
  /** Review comment, kept with the draft across a 409 round-trip and navigation. */
  comment: Ref<string>;
}

export function createDraftState(initial?: AgentConfigRevision): DraftState {
  return {
    baseRevision: ref(initial ? initial.revision : -1),
    original: shallowRef<OverlayDoc>(clone(initial?.overlay ?? {})),
    overlay: shallowRef<OverlayDoc>(clone(initial?.overlay ?? {})),
    comment: ref(''),
  };
}

function isDraftState(v: unknown): v is DraftState {
  // An AgentConfigRevision also has `overlay` and `comment`, but plain values, not refs.
  return (
    !!v && typeof v === 'object' && 'baseRevision' in v && isRef(v.baseRevision)
  );
}

export interface OverlayDraftOptions {
  /** Every known instance base (removals null a key any of them defines). */
  bases?: Ref<ConfigDoc[]>;
  /**
   * Issues found outside the browser (R89: the API preview of this draft), read lazily inside
   * `issues` so they may depend on this draft.
   */
  extraIssues?: () => ClientIssue[];
}

export function useOverlayDraft(
  initial: AgentConfigRevision | DraftState,
  base: Ref<ConfigDoc | null>,
  options: OverlayDraftOptions = {},
) {
  const state = isDraftState(initial) ? initial : createDraftState(initial);
  const { baseRevision, original, overlay } = state;

  const isDirty = computed(() => !deepEqual(overlay.value, original.value));
  /** Pointers of every changed leaf (arrays are one leaf): the "N pending changes". */
  const changedPaths = computed(() =>
    isDirty.value ? changedLeafPaths(original.value, overlay.value) : [],
  );
  const effectiveDraft = computed(() =>
    mergePatch<ConfigDoc>(base.value ?? {}, overlay.value),
  );
  /** The browser's client-only checks (R89). */
  const clientIssues = computed(() => validateOverlayClientSide(overlay.value));
  /** Client-only issues plus `extraIssues` (the API preview's), deduplicated. */
  const issues = computed(() => {
    const issues = [...clientIssues.value];
    const seen = new Set(issues.map((i) => `${i.ptr}\u0000${i.message}`));
    for (const i of options.extraIssues?.() ?? []) {
      const key = `${i.ptr}\u0000${i.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(i);
    }
    return issues;
  });

  /** Whether the draft changes `ptr`, something under it, or an ancestor of it. */
  function pendingAt(ptr: string): boolean {
    return changedPaths.value.some((p) => isPrefix(p, ptr) || isPrefix(ptr, p));
  }

  function set(ptr: string, v: unknown): void {
    overlay.value = setAt(overlay.value, ptr, v);
  }
  /** "Reset to file": omit the key. */
  function unset(ptr: string): void {
    overlay.value = unsetAt(overlay.value, ptr);
  }
  /** Explicit null: delete from the effective config (agent default applies, R56). */
  function remove(ptr: string): void {
    overlay.value = nullAt(overlay.value, ptr);
  }
  /**
   * null if ANY known base (or the placeholder base) has the key, else omit: a key that only
   * another instance's file defines must still be removed there.
   */
  function makeAbsent(ptr: string): void {
    const bases = [
      ...(options.bases?.value ?? []),
      ...(base.value ? [base.value] : []),
    ];
    overlay.value = bases.some((b) => hasAt(b, ptr))
      ? nullAt(overlay.value, ptr)
      : unsetAt(overlay.value, ptr);
  }
  /** Undo the draft at `ptr`: back to the saved overlay's value (or absence). */
  function revertPointer(ptr: string): void {
    overlay.value = hasAt(original.value, ptr)
      ? setAt(overlay.value, ptr, getAt(original.value, ptr))
      : unsetAt(overlay.value, ptr);
  }

  /** 409 handling: adopt `latest` as the base revision, keeping or discarding the draft. */
  function rebase(latest: AgentConfigRevision, keepDraft: boolean): void {
    baseRevision.value = latest.revision;
    original.value = clone(latest.overlay ?? {});
    if (!keepDraft) overlay.value = clone(latest.overlay ?? {});
  }

  /** Raw YAML apply / "Clear overlay" → {}. */
  function replaceAll(next: OverlayDoc): void {
    overlay.value = clone(next);
  }

  /** Drop every pending change. */
  function discard(): void {
    overlay.value = clone(original.value);
    state.comment.value = '';
  }

  return {
    state,
    baseRevision,
    original,
    overlay,
    comment: state.comment,
    isDirty,
    changedPaths,
    effectiveDraft,
    clientIssues,
    issues,
    pendingAt,
    set,
    unset,
    remove,
    makeAbsent,
    revertPointer,
    rebase,
    replaceAll,
    discard,
  };
}

export type OverlayDraft = ReturnType<typeof useOverlayDraft>;
