// policy_data is stored as an RFC 7396 merge patch, where `null` at an object key means
// "delete the key": a null value can't be stored for a key. Items of an array may be null (an
// array is written whole).
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import type { PatchOp } from '@/utils/agent-config/policy-data-patch';

export const NULL_KEY_ERROR =
  "null can't be stored for a key (it means delete in an overlay)";

/** The dotted path of the first object key holding null in `v` (outside arrays), or null. */
export function nullKeyPath(v: unknown, path: string[] = []): string | null {
  if (!isPlainObject(v)) return null;
  for (const [k, child] of Object.entries(v)) {
    if (child === null) return [...path, k].join('.');
    const found = nullKeyPath(child, [...path, k]);
    if (found !== null) return found;
  }
  return null;
}

/** Whether `ops` (key-level edits) would write null for some key. */
export function opsSetNullKey(ops: readonly PatchOp[]): boolean {
  return ops.some(
    (o) =>
      o.op === 'set' && (o.value === null || nullKeyPath(o.value) !== null),
  );
}
