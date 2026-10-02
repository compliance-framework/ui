// Pure edits of an overlay document at a JSON Pointer. Each returns a new document.
//
// R56 rule: "reset to file" = OMIT the key (unsetAt); `null` = delete the key from the
// effective config so the agent default applies (nullAt). makeAbsent picks between the two
// so a removal is expressed with the smallest overlay.

import {
  clone,
  getOwn,
  isPlainObject,
  setOwn,
  type PlainObject,
} from './merge-patch';
import { hasAt, parsePointer } from './json-pointer';
import { REDACTED_MASK } from '@/types/agent-config';

/**
 * Sets `value` at `ptr`. A `null` or non-object intermediate is replaced with `{}`, so an
 * "un-remove" (editing a field of a plugin the overlay had nulled) still works.
 */
export function setAt<T extends object>(
  overlay: T,
  ptr: string,
  value: unknown,
): T {
  const tokens = parsePointer(ptr);
  if (tokens.length === 0) {
    return (isPlainObject(value) ? clone(value) : {}) as T;
  }
  const root: PlainObject = isPlainObject(overlay)
    ? clone(overlay as PlainObject)
    : {};
  let cur = root;
  for (const token of tokens.slice(0, -1)) {
    // Own properties only: "__proto__" must never walk into Object.prototype.
    if (!isPlainObject(getOwn(cur, token))) setOwn(cur, token, {});
    cur = getOwn(cur, token) as PlainObject;
  }
  setOwn(cur, tokens[tokens.length - 1], clone(value));
  return root as T;
}

/**
 * Removes the key at `ptr` (so the file value applies again) and prunes parent objects that
 * became empty, up to depth 1 (a top-level key such as `plugins` is removed when empty; the
 * root is kept). An empty `plugins.<p>: {}` would otherwise still create an empty plugin
 * under RFC 7396.
 */
export function unsetAt<T extends object>(overlay: T, ptr: string): T {
  const tokens = parsePointer(ptr);
  if (tokens.length === 0) return {} as T;
  if (!hasAt(overlay, ptr)) return clone(overlay);
  const root = clone(overlay as unknown as PlainObject);
  const chain: PlainObject[] = [root];
  let cur = root;
  for (const token of tokens.slice(0, -1)) {
    const next = getOwn(cur, token);
    if (!isPlainObject(next)) return root as T;
    chain.push(next);
    cur = next;
  }
  delete cur[tokens[tokens.length - 1]];
  // Prune empty ancestors from the deepest up to (and including) depth 1.
  for (let depth = tokens.length - 1; depth >= 1; depth--) {
    const parent = chain[depth - 1];
    const key = tokens[depth - 1];
    const obj = chain[depth];
    if (Object.keys(obj).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }
  return root as T;
}

/** Writes an explicit `null` (RFC 7396 delete) at `ptr`. */
export function nullAt<T extends object>(overlay: T, ptr: string): T {
  return setAt(overlay, ptr, null);
}

/**
 * Makes the key absent from the EFFECTIVE config: `null` when the base defines it, otherwise
 * simply omits it from the overlay.
 */
export function makeAbsent<T extends object>(
  overlay: T,
  base: unknown,
  ptr: string,
): T {
  return hasAt(base, ptr) ? nullAt(overlay, ptr) : unsetAt(overlay, ptr);
}

/**
 * A merge patch that turns `source` into exactly `target` while keeping every target key
 * explicit (no normalisation against the base, which differs between instances): target keys
 * are written in full (nested objects recursively) and keys present only in `source` become
 * `null`. Used for whole-object editors such as `policy_data` (objects MERGE
 * under RFC 7396, so a key removed in the editor must be nulled).
 *
 * The source is a REDACTED report value: a leaf that is the mask ("••••") in both source and
 * target is omitted, so an untouched secret is never copied into the overlay (the host keeps
 * its own value) and the mask is never sent back (R25).
 */
export function replacingPatch(source: unknown, target: unknown): unknown {
  if (!isPlainObject(target)) return clone(target);
  const src: PlainObject = isPlainObject(source) ? source : {};
  const out: PlainObject = {};
  for (const [k, v] of Object.entries(target)) {
    if (v === REDACTED_MASK && getOwn(src, k) === REDACTED_MASK) continue;
    const sv = getOwn(src, k);
    setOwn(
      out,
      k,
      isPlainObject(v) && isPlainObject(sv) ? replacingPatch(sv, v) : clone(v),
    );
  }
  for (const k of Object.keys(src)) {
    if (!Object.prototype.hasOwnProperty.call(target, k)) setOwn(out, k, null);
  }
  return out;
}
