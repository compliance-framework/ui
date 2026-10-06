// RFC 6901 JSON Pointers (design R5). Every config path the API returns (`changes`, `unsafe`,
// 422 `overlay`/`instances` errors, `warnings`) is a pointer such as
// `/plugins/local-ssh/config/port` or `/plugins/local-ssh/labels/team~1owner`.

import { isPlainObject } from './merge-patch';

/** Escapes one reference token (`~` → `~0`, `/` → `~1`). */
export function escapeToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Unescapes one reference token (`~1` → `/`, then `~0` → `~`). */
export function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Splits a pointer into unescaped tokens. `""` is the root (no tokens). */
export function parsePointer(ptr: string): string[] {
  if (ptr === '') return [];
  if (!ptr.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer "${ptr}": must start with "/"`);
  }
  return ptr.slice(1).split('/').map(unescapeToken);
}

/** Joins unescaped tokens into a pointer. */
export function formatPointer(tokens: readonly string[]): string {
  return tokens.map((t) => `/${escapeToken(t)}`).join('');
}

/** Builds a pointer from tokens (alias of formatPointer that reads well at call sites). */
export function pointer(...tokens: string[]): string {
  return formatPointer(tokens);
}

function child(
  container: unknown,
  token: string,
): { found: boolean; value: unknown } {
  if (Array.isArray(container)) {
    if (!/^(0|[1-9]\d*)$/.test(token))
      return { found: false, value: undefined };
    const i = Number(token);
    return i < container.length
      ? { found: true, value: container[i] }
      : { found: false, value: undefined };
  }
  if (
    isPlainObject(container) &&
    Object.prototype.hasOwnProperty.call(container, token)
  ) {
    return { found: true, value: container[token] };
  }
  return { found: false, value: undefined };
}

/**
 * Value at `ptr`: `undefined` when absent (or when an intermediate is not a container), and
 * `null` for an explicit null.
 */
export function getAt(doc: unknown, ptr: string): unknown {
  let cur: unknown = doc;
  for (const token of parsePointer(ptr)) {
    const next = child(cur, token);
    if (!next.found) return undefined;
    cur = next.value;
  }
  return cur;
}

/** True when the key at `ptr` is present (even with a null value). */
export function hasAt(doc: unknown, ptr: string): boolean {
  let cur: unknown = doc;
  for (const token of parsePointer(ptr)) {
    const next = child(cur, token);
    if (!next.found) return false;
    cur = next.value;
  }
  return true;
}

/** True when `a` equals `b` or is an ancestor of it (token-wise, not string-wise). */
export function isPrefix(a: string, b: string): boolean {
  const pa = parsePointer(a);
  const pb = parsePointer(b);
  if (pa.length > pb.length) return false;
  return pa.every((t, i) => t === pb[i]);
}
