// Client-side config diff (R16): recurses into objects; arrays and strings are compared as a
// whole, except arrays under a plugin's policy_data, which are shown element by element (an
// overlay can only replace an array whole, RFC 7396, but one edited item is one change).
// Multi-line strings are flagged so the UI can open a text diff.

import { deepEqual, isPlainObject } from './merge-patch';
import { escapeToken, parsePointer } from './json-pointer';

/** A pointer inside a plugin's policy_data (where arrays are diffed element by element). */
export function isPolicyDataPointer(ptr: string): boolean {
  const t = parsePointer(ptr);
  return t.length >= 4 && t[0] === 'plugins' && t[2] === 'policy_data';
}

/** One element-level change between two arrays. */
export interface ElementChange {
  kind: 'added' | 'removed' | 'changed';
  /** Index in the old array (removed / changed). */
  beforeIndex?: number;
  /** Index in the new array (added / changed); for a removal, where it would be re-inserted. */
  afterIndex: number;
  before?: unknown;
  after?: unknown;
}

/** Above this many LCS cells (after trimming the common ends), the rest is compared index by index. */
const LCS_LIMIT = 250_000;

/**
 * Element-level changes from `before` to `after`: a longest-common-subsequence alignment (so an
 * insertion does not shift every later item into a "change"), where a removal and an addition
 * at the same spot pair into a `changed` element. The common prefix and suffix are matched
 * first, so one edit in an array of any size (the usual case) aligns exactly in linear memory;
 * only a middle larger than LCS_LIMIT cells falls back to index by index.
 */
export function arrayElementChanges(
  before: readonly unknown[],
  after: readonly unknown[],
): ElementChange[] {
  const n = before.length;
  const m = after.length;
  type Step = { op: 'eq' | 'del' | 'ins'; i: number; j: number };
  const steps: Step[] = [];
  let pre = 0;
  while (pre < n && pre < m && deepEqual(before[pre], after[pre])) pre++;
  let suf = 0;
  while (
    suf < n - pre &&
    suf < m - pre &&
    deepEqual(before[n - 1 - suf], after[m - 1 - suf])
  ) {
    suf++;
  }
  // The middle still to align: before[pre, ne) and after[pre, me).
  const ne = n - suf;
  const me = m - suf;
  const bn = ne - pre;
  const bm = me - pre;
  if (bn * bm > LCS_LIMIT) {
    for (let k = 0; k < Math.max(bn, bm); k++) {
      const i = pre + k;
      const j = pre + k;
      if (i < ne && j < me && deepEqual(before[i], after[j])) {
        steps.push({ op: 'eq', i, j });
        continue;
      }
      if (i < ne) steps.push({ op: 'del', i, j: Math.min(j, me) });
      if (j < me) steps.push({ op: 'ins', i: Math.min(i, ne), j });
    }
  } else {
    // lcs[a][b]: LCS length of before[pre + a, ne) and after[pre + b, me).
    const lcs = Array.from({ length: bn + 1 }, () =>
      new Array<number>(bm + 1).fill(0),
    );
    for (let a = bn - 1; a >= 0; a--) {
      for (let b = bm - 1; b >= 0; b--) {
        lcs[a][b] = deepEqual(before[pre + a], after[pre + b])
          ? lcs[a + 1][b + 1] + 1
          : Math.max(lcs[a + 1][b], lcs[a][b + 1]);
      }
    }
    let a = 0;
    let b = 0;
    while (a < bn || b < bm) {
      const i = pre + a;
      const j = pre + b;
      if (a < bn && b < bm && deepEqual(before[i], after[j])) {
        steps.push({ op: 'eq', i, j });
        a++;
        b++;
      } else if (b < bm && (a >= bn || lcs[a][b + 1] >= lcs[a + 1][b])) {
        steps.push({ op: 'ins', i, j });
        b++;
      } else {
        steps.push({ op: 'del', i, j });
        a++;
      }
    }
  }
  // Pair the deletions and insertions of each run between two equal elements.
  const out: ElementChange[] = [];
  let k = 0;
  while (k < steps.length) {
    if (steps[k].op === 'eq') {
      k++;
      continue;
    }
    const dels: Step[] = [];
    const ins: Step[] = [];
    while (k < steps.length && steps[k].op !== 'eq') {
      (steps[k].op === 'del' ? dels : ins).push(steps[k]);
      k++;
    }
    const paired = Math.min(dels.length, ins.length);
    for (let x = 0; x < paired; x++) {
      out.push({
        kind: 'changed',
        beforeIndex: dels[x].i,
        afterIndex: ins[x].j,
        before: before[dels[x].i],
        after: after[ins[x].j],
      });
    }
    for (const d of dels.slice(paired)) {
      out.push({
        kind: 'removed',
        beforeIndex: d.i,
        afterIndex: d.j,
        before: before[d.i],
      });
    }
    for (const a of ins.slice(paired)) {
      out.push({ kind: 'added', afterIndex: a.j, after: after[a.j] });
    }
  }
  return out;
}

/** The pointer of an element change under the array at `arrayPtr`. */
export function elementPointer(arrayPtr: string, c: ElementChange): string {
  return `${arrayPtr}/${c.kind === 'removed' ? c.beforeIndex : c.afterIndex}`;
}

export interface DiffEntry {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
  multiline?: boolean;
}

function isMultiline(v: unknown): boolean {
  return typeof v === 'string' && v.includes('\n');
}

function walk(
  path: string,
  before: unknown,
  after: unknown,
  out: DiffEntry[],
  expand: (ptr: string) => boolean,
): void {
  if (Array.isArray(before) && Array.isArray(after) && expand(path)) {
    for (const c of arrayElementChanges(before, after)) {
      out.push(entry(elementPointer(path, c), c.kind, c.before, c.after));
    }
    return;
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)]),
    ).sort();
    for (const key of keys) {
      const p = `${path}/${escapeToken(key)}`;
      const hasB = Object.prototype.hasOwnProperty.call(before, key);
      const hasA = Object.prototype.hasOwnProperty.call(after, key);
      if (hasB && !hasA) {
        out.push(entry(p, 'removed', before[key], undefined));
      } else if (!hasB && hasA) {
        out.push(entry(p, 'added', undefined, after[key]));
      } else {
        walk(p, before[key], after[key], out, expand);
      }
    }
    return;
  }
  if (!deepEqual(before, after)) {
    out.push(entry(path, 'changed', before, after));
  }
}

function entry(
  path: string,
  kind: DiffEntry['kind'],
  before: unknown,
  after: unknown,
): DiffEntry {
  const e: DiffEntry = { path, kind };
  if (kind !== 'added') e.before = before;
  if (kind !== 'removed') e.after = after;
  if (isMultiline(before) || isMultiline(after)) e.multiline = true;
  return e;
}

/**
 * Differences between two documents. Arrays at pointers `expandArrays` accepts (by default
 * those under a plugin's policy_data) are diffed element by element.
 */
export function diffConfigs(
  before: unknown,
  after: unknown,
  expandArrays: (ptr: string) => boolean = isPolicyDataPointer,
): DiffEntry[] {
  const out: DiffEntry[] = [];
  walk('', before ?? {}, after ?? {}, out, expandArrays);
  return out;
}

function leafDiffPaths(
  path: string,
  a: unknown,
  b: unknown,
  hasA: boolean,
  hasB: boolean,
  out: string[],
): void {
  let objA = isPlainObject(a) ? a : null;
  let objB = isPlainObject(b) ? b : null;
  if (objA && !hasB) objB = {};
  else if (objB && !hasA) objA = {};
  if (objA && objB) {
    const keys = Array.from(
      new Set([...Object.keys(objA), ...Object.keys(objB)]),
    ).sort();
    const pushed = out.length;
    for (const k of keys) {
      leafDiffPaths(
        `${path}/${escapeToken(k)}`,
        objA[k],
        objB[k],
        Object.prototype.hasOwnProperty.call(objA, k),
        Object.prototype.hasOwnProperty.call(objB, k),
        out,
      );
    }
    // An object added or removed with no leaf below it (`n: {}`) is itself the change.
    if (hasA !== hasB && out.length === pushed) out.push(path);
    return;
  }
  if (hasA !== hasB || !deepEqual(a, b)) out.push(path);
}

/** RFC 6901 pointers of every leaf that differs between two overlays (arrays are leaves). */
export function changedLeafPaths(a: unknown, b: unknown): string[] {
  const out: string[] = [];
  leafDiffPaths('', a, b, true, true, out);
  return out;
}
