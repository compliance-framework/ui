// Minimal merge patches for `plugins.<p>.policy_data` (R69): an edit records only what it
// changes, at the pointer it changes, and composes with the pending overlay like the other
// per-field edits:
//   - objects recurse key by key: a changed / added value is written at its own pointer;
//   - a removed key becomes `null` where a host's file has it (else the entry is dropped);
//   - arrays cannot be patched partially (RFC 7396), so a changed array is written whole at
//     the array's pointer;
//   - setting a value back to what every known file has drops the overlay entry instead of
//     pinning a no-op (the hosts' files apply again);
//   - unchanged keys and untouched masked values ("••••") produce no entry at all.
// `bases` are the hosts' files (every loaded instance base). They differ between instances, so
// "back to the file value" means equal in all of them.

import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import {
  clone,
  deepEqual,
  isPlainObject,
  setOwn,
  type PlainObject,
} from './merge-patch';
import {
  escapeToken,
  formatPointer,
  getAt,
  hasAt,
  parsePointer,
} from './json-pointer';
import { nullAt, setAt, unsetAt } from './overlay-ops';
import { isPolicyDataPointer } from './config-diff';

export type PatchOp =
  | { op: 'set'; ptr: string; value: unknown }
  | { op: 'remove'; ptr: string };

/**
 * The edits turning `before` into `after` at `ptr`: objects recurse key by key (an added or
 * changed key is a `set`, a removed one a `remove`); anything else that differs (a scalar, an
 * array, a type change) is one `set` of the whole value.
 */
export function diffOps(
  ptr: string,
  before: unknown,
  after: unknown,
): PatchOp[] {
  const out: PatchOp[] = [];
  walk(ptr, before, after, out);
  return out;
}

function walk(ptr: string, before: unknown, after: unknown, out: PatchOp[]) {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      const p = `${ptr}/${escapeToken(k)}`;
      const inB = Object.prototype.hasOwnProperty.call(before, k);
      const inA = Object.prototype.hasOwnProperty.call(after, k);
      if (!inA) out.push({ op: 'remove', ptr: p });
      else if (!inB) out.push({ op: 'set', ptr: p, value: clone(after[k]) });
      else walk(p, before[k], after[k], out);
    }
    return;
  }
  if (!deepEqual(before, after))
    out.push({ op: 'set', ptr, value: clone(after) });
}

/** The pointers from `scope` (inclusive) down to the parent of `ptr`. */
function ancestors(scope: string, ptr: string): string[] {
  const s = parsePointer(scope);
  const t = parsePointer(ptr);
  const out: string[] = [];
  for (let n = s.length; n < t.length; n++)
    out.push(formatPointer(t.slice(0, n)));
  return out;
}

function baseKeys(bases: readonly ConfigDoc[], ptr: string): string[] {
  const keys = new Set<string>();
  for (const b of bases) {
    const v = getAt(b, ptr);
    if (isPlainObject(v)) Object.keys(v).forEach((k) => keys.add(k));
  }
  return Array.from(keys);
}

/**
 * `value` as a patch that REPLACES what the files have at `ptr`: objects merge under RFC 7396,
 * so a key some file has but `value` lacks is nulled (recursively for nested objects).
 */
function replacing(
  bases: readonly ConfigDoc[],
  ptr: string,
  value: unknown,
): unknown {
  if (!isPlainObject(value)) return clone(value);
  const out: PlainObject = {};
  for (const k of baseKeys(bases, ptr)) {
    if (!Object.prototype.hasOwnProperty.call(value, k)) setOwn(out, k, null);
  }
  for (const [k, v] of Object.entries(value)) {
    setOwn(out, k, replacing(bases, `${ptr}/${escapeToken(k)}`, v));
  }
  return out;
}

/**
 * Sets the EFFECTIVE value at `ptr` (under `scope`, e.g. a plugin's policy_data) to `value`
 * with the smallest overlay edit.
 */
export function setValue<T extends OverlayDoc>(
  overlay: T,
  ptr: string,
  value: unknown,
  bases: readonly ConfigDoc[],
  scope: string,
): T {
  const above = ancestors(scope, ptr);
  const nulled = above.some((a) => getAt(overlay, a) === null);
  if (
    bases.length &&
    !nulled &&
    bases.every((b) => hasAt(b, ptr) && deepEqual(getAt(b, ptr), value))
  ) {
    return unsetAt(overlay, ptr);
  }
  let out = overlay;
  // A nulled ancestor (the overlay deletes that object): bring it back as an object that still
  // deletes every file key, so only the new value appears.
  for (const a of above) {
    if (getAt(out, a) === null) {
      const nulls: PlainObject = {};
      for (const k of baseKeys(bases, a)) setOwn(nulls, k, null);
      out = setAt(out, a, nulls);
    }
  }
  return setAt(out, ptr, replacing(bases, ptr, value));
}

/**
 * Removes the key / value at `ptr` from the EFFECTIVE config (any overlay pointer, against
 * every known host file): `null` where some file has it, else the overlay entry is dropped.
 *
 * Dropping an entry prunes parent objects it leaves empty (an empty `plugins.<p>: {}` would
 * create a plugin under RFC 7396). Inside a plugin's policy_data, though, an empty object is
 * data: an emptied parent is pruned only when every file already has an object there (so `{}`
 * is a no-op), otherwise it is kept as `{}`.
 */
export function removeValueAt<T extends OverlayDoc>(
  overlay: T,
  ptr: string,
  bases: readonly ConfigDoc[],
): T {
  if (bases.some((b) => hasAt(b, ptr))) return nullAt(overlay, ptr);
  const out = unsetAt(overlay, ptr);
  const parent = formatPointer(parsePointer(ptr).slice(0, -1));
  if (
    isPolicyDataPointer(parent) &&
    isPlainObject(getAt(overlay, parent)) &&
    !hasAt(out, parent) &&
    !(bases.length && bases.every((b) => isPlainObject(getAt(b, parent))))
  ) {
    return setAt(out, parent, {});
  }
  return out;
}

/** Applies `ops` in order (setValue / removeValueAt). */
export function applyOps<T extends OverlayDoc>(
  overlay: T,
  ops: readonly PatchOp[],
  bases: readonly ConfigDoc[],
  scope: string,
): T {
  let out = overlay;
  for (const o of ops) {
    out =
      o.op === 'set'
        ? setValue(out, o.ptr, o.value, bases, scope)
        : removeValueAt(out, o.ptr, bases);
  }
  return out;
}
