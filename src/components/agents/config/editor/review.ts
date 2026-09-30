// Pure helpers for the review step (LLD U2.5).

import type {
  ChangeSafety,
  ConfigChange,
  ConfigErrorBody,
  ConfigPreview,
  InstancePreview,
} from '@/types/agent-config';
import { isPrefix } from '@/utils/agent-config/json-pointer';

export type SafetyTagKind = ChangeSafety | 'no-effect';

const RANK: Record<ChangeSafety, number> = { safe: 0, unsafe: 1, forbidden: 2 };

/**
 * The safety of a diff row: the most specific change whose path equals the row pointer or is
 * its prefix; failing that (e.g. a whole plugin added), the worst change under the row; no
 * change at all means the row matches the instance's file again ("no effect vs file").
 */
export function safetyForRow(
  path: string,
  changes: ConfigChange[],
): SafetyTagKind {
  let best: ConfigChange | null = null;
  for (const c of changes) {
    if (isPrefix(c.path, path) && (!best || c.path.length > best.path.length))
      best = c;
  }
  if (best) {
    // Several changes can share the most specific path (e.g. two new policy sources).
    const same = changes.filter((c) => c.path === best!.path);
    return same.reduce<ChangeSafety>(
      (w, c) => (RANK[c.safety] > RANK[w] ? c.safety : w),
      'safe',
    );
  }
  const under = changes.filter((c) => isPrefix(path, c.path));
  if (!under.length) return 'no-effect';
  return under.reduce<ChangeSafety>(
    (w, c) => (RANK[c.safety] > RANK[w] ? c.safety : w),
    'safe',
  );
}

/** Whether an instance's errors block a save (R48). Older APIs lack `validated` (§C). */
export function instanceErrorsBlock(inst: InstancePreview): boolean {
  if (!inst.errors.length) return false;
  if (inst.validated === undefined) return !inst.stale;
  return inst.validated;
}

export function previewBlocks(preview: ConfigPreview | null): boolean {
  if (!preview) return false;
  return (
    preview.overlayErrors.length > 0 ||
    preview.policyErrors.some((e) => e.severity === 'error') ||
    preview.instances.some(instanceErrorsBlock)
  );
}

export function saveErrorsBlock(
  body: ConfigErrorBody | null | undefined,
): boolean {
  if (!body) return false;
  return (
    (body.overlay?.length ?? 0) > 0 ||
    (body.instances ?? []).some((i) => i.errors?.length) ||
    (body['policy-errors'] ?? []).some((e) => e.severity === 'error')
  );
}

export function truncate(
  value: unknown,
  max = 120,
): { text: string; truncated: boolean } {
  const text =
    value === undefined
      ? ''
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);
  return text.length > max
    ? { text: `${text.slice(0, max)}…`, truncated: true }
    : { text, truncated: false };
}
