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
import {
  applyOps as applyPatchOps,
  removeValueAt,
  setValue as setValueAt,
  type PatchOp,
} from '@/utils/agent-config/policy-data-patch';
import {
  arrayElementChanges,
  changedLeafPaths,
  elementPointer,
  isPolicyDataPointer,
  type ElementChange,
} from '@/utils/agent-config/config-diff';
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

/** Whether two overlays agree at `ptr` (both lack it, or hold equal values). */
function sameAt(a: OverlayDoc, b: OverlayDoc, ptr: string): boolean {
  const has = hasAt(a, ptr);
  if (has !== hasAt(b, ptr)) return false;
  return !has || deepEqual(getAt(a, ptr), getAt(b, ptr));
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
  const effectiveDraft = computed(() =>
    mergePatch<ConfigDoc>(base.value ?? {}, overlay.value),
  );
  /** The effective config of the saved overlay (what element changes are counted from). */
  const effectiveOriginal = computed(() =>
    mergePatch<ConfigDoc>(base.value ?? {}, original.value),
  );
  /**
   * The changed leaves: pointers of the "N pending changes". Arrays are one leaf, except under
   * a plugin's policy_data, where a changed array (written whole, RFC 7396) counts as its
   * changed elements; `elements` maps each such element pointer to its change.
   */
  const changes = computed(() => {
    const paths: string[] = [];
    const elements = new Map<
      string,
      { arrayPtr: string; change: ElementChange }
    >();
    if (!isDirty.value) return { paths, elements };
    for (const p of changedLeafPaths(original.value, overlay.value)) {
      const before = isPolicyDataPointer(p)
        ? getAt(effectiveOriginal.value, p)
        : undefined;
      const after = isPolicyDataPointer(p)
        ? getAt(effectiveDraft.value, p)
        : undefined;
      const diff =
        Array.isArray(before) && Array.isArray(after)
          ? arrayElementChanges(before, after)
          : [];
      if (!diff.length) {
        paths.push(p);
        continue;
      }
      for (const change of diff) {
        const ep = elementPointer(p, change);
        if (elements.has(ep)) continue;
        elements.set(ep, { arrayPtr: p, change });
        paths.push(ep);
      }
    }
    return { paths, elements };
  });
  const changedPaths = computed(() => changes.value.paths);
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
   * Removes the key from the effective config: null if ANY known base (or the placeholder
   * base) has it, else omit (a key only another instance's file defines must still be removed
   * there). Same rule as `removeValue` (policy-data-patch.ts `removeValueAt`).
   */
  function makeAbsent(ptr: string): void {
    overlay.value = removeValueAt(overlay.value, ptr, knownBases());
  }
  /** Every known host file (the instance bases and the placeholder base). */
  function knownBases(): ConfigDoc[] {
    const all = [...(options.bases?.value ?? [])];
    if (base.value && !all.includes(base.value)) all.push(base.value);
    return all;
  }
  /**
   * Minimal edits of a whole-document field such as policy_data (policy-data-patch.ts): set
   * the effective value at `ptr` (under `scope`), dropping the entry when it is the file
   * value again; remove a key (null where a file has it); or apply a list of such edits.
   */
  function setValue(ptr: string, v: unknown, scope: string): void {
    overlay.value = setValueAt(overlay.value, ptr, v, knownBases(), scope);
  }
  function removeValue(ptr: string): void {
    overlay.value = removeValueAt(overlay.value, ptr, knownBases());
  }
  function applyOps(ops: readonly PatchOp[], scope: string): void {
    overlay.value = applyPatchOps(overlay.value, ops, knownBases(), scope);
  }

  /** Undo the draft at `ptr`: back to the saved overlay's value (or absence). */
  function revertPointer(ptr: string): void {
    const element = changes.value.elements.get(ptr);
    if (element) {
      revertElement(element.arrayPtr, element.change);
      return;
    }
    overlay.value = hasAt(original.value, ptr)
      ? setAt(overlay.value, ptr, getAt(original.value, ptr))
      : unsetAt(overlay.value, ptr);
  }

  /** Undo one element of a changed array; the array is written whole (or reverted). */
  function revertElement(arrayPtr: string, c: ElementChange): void {
    const now = getAt(effectiveDraft.value, arrayPtr);
    const saved = getAt(effectiveOriginal.value, arrayPtr);
    if (!Array.isArray(now)) return;
    const next = clone(now);
    if (c.kind === 'changed') next[c.afterIndex] = clone(c.before);
    else if (c.kind === 'added') next.splice(c.afterIndex, 1);
    else next.splice(c.afterIndex, 0, clone(c.before));
    if (deepEqual(next, saved)) {
      overlay.value = hasAt(original.value, arrayPtr)
        ? setAt(overlay.value, arrayPtr, getAt(original.value, arrayPtr))
        : unsetAt(overlay.value, arrayPtr);
    } else {
      overlay.value = setAt(overlay.value, arrayPtr, next);
    }
  }

  /**
   * 409 handling: adopt `latest` as the base revision, keeping or discarding the draft. Kept,
   * only the draft's own changes (against the old base) are re-applied onto `latest`'s overlay,
   * so the other revision's changes survive. Returns the pointers both sides changed (the
   * draft's value wins there).
   */
  function rebase(latest: AgentConfigRevision, keepDraft: boolean): string[] {
    const theirs = clone(latest.overlay ?? {});
    const conflicts: string[] = [];
    if (keepDraft) {
      const mine = overlay.value;
      const theirChanges = changedLeafPaths(original.value, theirs);
      let next = clone(theirs);
      for (const p of changedLeafPaths(original.value, mine)) {
        // Both changed it (or an ancestor / descendant of it), to different values.
        if (
          !sameAt(mine, theirs, p) &&
          theirChanges.some((t) => isPrefix(t, p) || isPrefix(p, t))
        )
          conflicts.push(p);
        next = hasAt(mine, p)
          ? setAt(next, p, getAt(mine, p))
          : unsetAt(next, p);
      }
      overlay.value = next;
    } else {
      overlay.value = clone(theirs);
    }
    baseRevision.value = latest.revision;
    original.value = theirs;
    return conflicts;
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
    setValue,
    removeValue,
    applyOps,
    revertPointer,
    rebase,
    replaceAll,
    discard,
  };
}

export type OverlayDraft = ReturnType<typeof useOverlayDraft>;
