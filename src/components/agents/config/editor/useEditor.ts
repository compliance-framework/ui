// Shared access to the editor draft and context for the components that edit the
// pending-changes draft (the inline Effective-view editors), plus the preview-derived hints
// (shields, trust hints) and lock/"differs" hints (LLD U2.3).

import { inject } from 'vue';
import type { ConfigChange, ConfigPreview } from '@/types/agent-config';
import {
  EDITOR_CONTEXT_KEY,
  OVERLAY_DRAFT_KEY,
} from '@/composables/agent-config/editorContext';
import { deepEqual } from '@/utils/agent-config/merge-patch';
import { getAt, hasAt, isPrefix } from '@/utils/agent-config/json-pointer';
import type { FieldAccess } from '@/utils/agent-config/field-access';
import { CHANGE_REASON_LABELS, labelFor } from '../constants';

export interface Shield {
  level: 'unsafe' | 'forbidden';
  tooltip: string;
}

export interface TrustHint {
  safe: number;
  total: number;
  label: string;
}

function covers(changePath: string, ptr: string): boolean {
  return isPrefix(changePath, ptr) || isPrefix(ptr, changePath);
}

/** Pure: a shield when the field is unsafe/forbidden on EVERY non-stale previewed instance. */
export function shieldFor(
  preview: ConfigPreview | null,
  ptr: string,
): Shield | null {
  const fresh = (preview?.instances ?? []).filter((i) => !i.stale);
  if (!fresh.length) return null;
  let allForbidden = true;
  for (const inst of fresh) {
    const hits = inst.changes.filter(
      (c) =>
        covers(c.path, ptr) &&
        (c.safety === 'unsafe' || c.safety === 'forbidden'),
    );
    if (!hits.length) return null;
    if (!hits.some((c) => c.safety === 'forbidden')) allForbidden = false;
  }
  const applyAll = fresh
    .filter((i) => i.mode === 'apply_all')
    .map((i) => i.hostname || i.instanceId.slice(0, 8));
  if (allForbidden) return { level: 'forbidden', tooltip: 'Forbidden' };
  let tooltip = 'Requires `apply_all` on the agent';
  if (applyAll.length) tooltip += `. Applied anyway by: ${applyAll.join(', ')}`;
  return { level: 'unsafe', tooltip };
}

/** Pure: "trusted on n/m instances" for a source written at `ptr` (U2.3). */
export function trustHintFor(
  preview: ConfigPreview | null,
  ptr: string,
  source: string,
): TrustHint | null {
  const fresh = (preview?.instances ?? []).filter((i) => !i.stale);
  let safe = 0;
  let total = 0;
  let first: ConfigChange | null = null;
  for (const inst of fresh) {
    const c = inst.changes.find((ch) => ch.path === ptr && ch.value === source);
    if (!c) continue;
    total++;
    if (c.safety === 'safe') safe++;
    first ??= c;
  }
  if (!total || !first) return null;
  return {
    safe,
    total,
    label: labelFor(CHANGE_REASON_LABELS, first.reason) ?? first.reason,
  };
}

export function useEditor() {
  const draft = inject(OVERLAY_DRAFT_KEY)!;
  const ctx = inject(EDITOR_CONTEXT_KEY)!;

  function has(ptr: string): boolean {
    return hasAt(draft.overlay.value, ptr);
  }
  function overlayValue(ptr: string): unknown {
    return getAt(draft.overlay.value, ptr);
  }
  function baseValue(ptr: string): unknown {
    return getAt(ctx.placeholderBase.value ?? {}, ptr);
  }
  function effectiveValue(ptr: string): unknown {
    return getAt(draft.effectiveDraft.value, ptr);
  }
  function issuesAt(ptr: string) {
    return draft.issues.value.filter((i) => i.ptr === ptr);
  }
  /** True when the known instances' file values differ at `ptr`. */
  function differsAcrossInstances(ptr: string): boolean {
    const bases = ctx.bases.value;
    if (bases.length < 2) return false;
    const first = getAt(bases[0], ptr);
    return bases.some((b) => !deepEqual(getAt(b, ptr), first));
  }
  /** R71 three-state access of the field at `ptr` (field-access.ts). */
  function access(ptr: string): FieldAccess {
    return ctx.accessAt(ptr);
  }
  function shield(ptr: string): Shield | null {
    return shieldFor(ctx.lastPreview.value, ptr);
  }
  function trustHint(ptr: string, source: string): TrustHint | null {
    return trustHintFor(ctx.lastPreview.value, ptr, source);
  }

  return {
    draft,
    ctx,
    has,
    overlayValue,
    baseValue,
    effectiveValue,
    issuesAt,
    differsAcrossInstances,
    access,
    shield,
    trustHint,
  };
}
