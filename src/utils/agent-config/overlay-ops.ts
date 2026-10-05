// Pure edits of an overlay document at a JSON Pointer. Each returns a new document.
//
// R56 rule: "reset to file" = OMIT the key (unsetAt); `null` = delete the key from the
// effective config so the agent default applies (nullAt). removeValueAt (policy-data-patch.ts)
// picks between the two against every known host file.

import {
  clone,
  getOwn,
  isPlainObject,
  setOwn,
  type PlainObject,
} from './merge-patch';
import { hasAt, parsePointer } from './json-pointer';

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
