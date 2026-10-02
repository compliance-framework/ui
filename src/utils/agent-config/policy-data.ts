// Pure helpers of the structured `policy_data` view/editor (PolicyDataTree). Edits are
// written per pointer (policy-data-patch.ts). Keys are used verbatim (own properties only,
// "__proto__" included): never case-converted. A value keeps its JSON type when edited; a
// type change is done in the raw JSON view.

import { REDACTED_MASK } from '@/types/agent-config';
import { clone, getOwn, isPlainObject, setOwn } from './merge-patch';

export type JsonType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array';

export type DataPath = readonly (string | number)[];

export function jsonType(v: unknown): JsonType {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (isPlainObject(v)) return 'object';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  return 'string';
}

export function isContainer(v: unknown): boolean {
  return Array.isArray(v) || isPlainObject(v);
}

/** The report mask (R25): the host keeps its own value unless a new one is typed. */
export function isMasked(v: unknown): boolean {
  return v === REDACTED_MASK;
}

const ENV_REF = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** The ${env:NAME} references in a string (agentconfig.EnvRefPattern), in order. */
export function envRefs(s: string): string[] {
  return Array.from(s.matchAll(ENV_REF), (m) => m[1]);
}

/** A string split into plain text and ${env:NAME} parts, for display. */
export function envSegments(s: string): { text: string; env: boolean }[] {
  const out: { text: string; env: boolean }[] = [];
  let last = 0;
  for (const m of s.matchAll(ENV_REF)) {
    if (m.index! > last) out.push({ text: s.slice(last, m.index), env: false });
    out.push({ text: m[0], env: true });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), env: false });
  return out;
}

function childOf(container: unknown, key: string | number): unknown {
  if (Array.isArray(container)) return container[Number(key)];
  return isPlainObject(container) ? getOwn(container, String(key)) : undefined;
}

/** The value at `path` (undefined when absent). */
export function getIn(root: unknown, path: DataPath): unknown {
  let cur = root;
  for (const k of path) cur = childOf(cur, k);
  return cur;
}

/** A copy of `root` with `value` at `path` (an index equal to the length appends). */
export function setIn<T>(root: T, path: DataPath, value: unknown): T {
  if (!path.length) return clone(value) as T;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const out = root.slice();
    out[Number(head)] = setIn(out[Number(head)], rest, value);
    return out as T;
  }
  const out = isPlainObject(root) ? clone(root) : {};
  setOwn(out, String(head), setIn(getOwn(out, String(head)), rest, value));
  return out as T;
}

/**
 * A copy of `root` without the entry at `path`: an object key is dropped (the editor's target
 * loses it, so the merge patch nulls it where the base has it); an array item is spliced out
 * (arrays are replaced wholesale).
 */
export function removeIn<T>(root: T, path: DataPath): T {
  if (!path.length) return root;
  const parentPath = path.slice(0, -1);
  const key = path[path.length - 1];
  const parent = getIn(root, parentPath);
  let next: unknown;
  if (Array.isArray(parent)) {
    next = parent.filter((_, i) => i !== Number(key));
  } else if (isPlainObject(parent)) {
    next = clone(parent);
    delete (next as Record<string, unknown>)[String(key)];
  } else {
    return root;
  }
  return parentPath.length ? setIn(root, parentPath, next) : (next as T);
}

/**
 * Parses the text of a scalar editor as `type`. Strings are taken verbatim; numbers must be
 * finite JSON numbers; booleans "true"/"false".
 */
export function parseScalar(
  text: string,
  type: JsonType,
): { value: unknown; error: string } {
  switch (type) {
    case 'number': {
      const t = text.trim();
      const n = Number(t);
      if (!t || !Number.isFinite(n)) {
        return { value: undefined, error: 'Enter a number' };
      }
      return { value: n, error: '' };
    }
    case 'boolean':
      if (text !== 'true' && text !== 'false') {
        return { value: undefined, error: 'Choose true or false' };
      }
      return { value: text === 'true', error: '' };
    case 'null':
      return { value: null, error: '' };
    case 'object':
      return { value: {}, error: '' };
    case 'array':
      return { value: [], error: '' };
    default:
      return { value: text, error: '' };
  }
}

/**
 * A value typed into an "add" form: as `type` when the container dictates one (an array whose
 * items share a scalar type), else as a JSON literal when it parses (5, true, null, [], {},
 * "quoted"), else as the plain string.
 */
export function parseNewValue(
  text: string,
  type: JsonType | null,
): { value: unknown; error: string } {
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return parseScalar(text, type);
  }
  try {
    return { value: JSON.parse(text), error: '' };
  } catch {
    return { value: text, error: '' };
  }
}

/** The scalar type every item of `arr` shares, or null (mixed, containers, empty). */
export function itemType(arr: readonly unknown[]): JsonType | null {
  const types = new Set(arr.map(jsonType));
  if (types.size !== 1) return null;
  const [t] = types;
  return t === 'string' || t === 'number' || t === 'boolean' ? t : null;
}

/** Display text of a scalar ('' for containers). */
export function scalarText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return 'null';
  if (isContainer(v)) return '';
  return String(v);
}

/** Containers deeper than this, or larger than COLLAPSE_SIZE, start collapsed. */
export const COLLAPSE_DEPTH = 2;
export const COLLAPSE_SIZE = 20;
/** Children rendered before a "Show all" button. */
export const CHILD_PAGE = 50;

export function sizeOf(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  return isPlainObject(v) ? Object.keys(v).length : 0;
}

export function startsCollapsed(depth: number, v: unknown): boolean {
  return depth >= COLLAPSE_DEPTH || sizeOf(v) > COLLAPSE_SIZE;
}
