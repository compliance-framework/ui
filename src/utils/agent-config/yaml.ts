// YAML rendering and parsing of config documents. CORE_SCHEMA everywhere (design 12.6), so
// timestamps stay strings and `yes`/`no` are not booleans.

import * as jsYaml from 'js-yaml';
import { CORE_SCHEMA, dump, load, Type, YAMLException } from 'js-yaml';
import { isPlainObject } from './merge-patch';

export function toYaml(doc: unknown): string {
  if (doc === undefined || doc === null) return '';
  if (isPlainObject(doc) && Object.keys(doc).length === 0) return '{}\n';
  return dump(doc, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    schema: CORE_SCHEMA,
  });
}

export interface YamlError {
  message: string;
  /** 0-based line. */
  line: number;
  /** 0-based column. */
  column: number;
}

export type ParseYamlResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: YamlError };

/** A number as JSON writes it; anything else (0644, 0x1F, 0o17, +5, .inf) is ambiguous. */
const DECIMAL_RE = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?$/;

/** A YAML number that would not be saved as typed; parseYaml reports the first one. */
class RejectedNumber {
  line = 0;
  column = 0;
  constructor(
    readonly text: string,
    readonly reason: string,
  ) {}
}

/**
 * Why a number scalar would not be saved as typed, or ''. JSON has no Infinity / NaN (they are
 * written as null, an RFC 7396 delete), integers above 2^53 lose digits, and CORE_SCHEMA reads
 * 0644, 0x1F and 0o17 as 644, 31 and 15 where the agent's YAML reader may not.
 */
function numberProblem(text: string, value: number): string {
  if (!Number.isFinite(value)) return 'is not a finite number';
  if (!DECIMAL_RE.test(text)) return 'is not a plain decimal number';
  if (
    Number.isInteger(value) &&
    !Number.isSafeInteger(value) &&
    !/[.eE]/.test(text)
  ) {
    return 'has more digits than can be stored exactly';
  }
  return '';
}

/** What the current parseYaml call has seen (load is synchronous). */
let parsing: { rejected: RejectedNumber[]; content: boolean } | null = null;

/** CORE_SCHEMA's int / float, constructing a RejectedNumber for a value numberProblem rejects. */
function checked(tag: string, t: Type): Type {
  return new Type(tag, {
    kind: 'scalar',
    resolve: (data: string) => t.resolve(data),
    construct: (data: string) => {
      const value = t.construct(data);
      const why = numberProblem(String(data), value);
      if (!why) return value;
      const r = new RejectedNumber(String(data), why);
      parsing?.rejected.push(r);
      return r;
    },
  });
}

const { int, float } = (
  jsYaml as unknown as { types: { int: Type; float: Type } }
).types;
const OVERLAY_SCHEMA = CORE_SCHEMA.extend({
  implicit: [
    checked('tag:yaml.org,2002:int', int),
    checked('tag:yaml.org,2002:float', float),
  ],
});

/**
 * Records whether the document has any node (comment-only text and an explicit `null` both
 * load as null) and where each rejected number is (js-yaml marks only its own errors).
 */
function listener(eventType: string, state: jsYaml.State) {
  if (eventType !== 'close' || !parsing) return;
  if (state.kind) parsing.content = true;
  if (!(state.result instanceof RejectedNumber)) return;
  const r = state.result;
  r.line = state.line;
  r.column = Math.max(0, state.position - state.lineStart - r.text.length);
}

/** More values than an overlay plausibly has; the walk stops there. */
const MAX_NODES = 100_000;

/**
 * Why a loaded document is not accepted, or null. js-yaml has no alias limit and loads an alias
 * of a mapping / sequence as a shared reference, so a few hundred bytes of nested aliases
 * expand into billions of nodes for any later walk. A container reached twice IS an alias, so
 * the check stops at the first one, before anything is expanded. `<<` merge keys are not part
 * of CORE_SCHEMA and would be saved as a literal "<<" key.
 */
function unsupported(root: unknown): string | null {
  const seen = new Set<object>();
  const stack: object[] = [];
  let nodes = 0;
  const visit = (v: unknown): string | null => {
    if (++nodes > MAX_NODES) return 'Document is too large';
    if (v === null || typeof v !== 'object') return null;
    if (seen.has(v)) return 'YAML aliases are not supported';
    seen.add(v);
    stack.push(v);
    return null;
  };
  let err = visit(root);
  while (!err && stack.length) {
    const v = stack.pop() as object;
    if (!Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, '<<')) {
      return 'YAML merge keys (<<) are not supported';
    }
    for (const child of Object.values(v)) {
      err = visit(child);
      if (err) break;
    }
  }
  return err;
}

/**
 * Parses an overlay document. Empty (or comment-only) text is `{}`; a non-mapping root
 * (explicit `null` / `~` included), a number that would not be saved as typed (quote it), an
 * alias of a mapping or sequence, and a `<<` merge key are errors.
 */
export function parseYaml(text: string): ParseYamlResult {
  if (text.trim() === '') return { ok: true, value: {} };
  let value: unknown;
  const seen = { rejected: [] as RejectedNumber[], content: false };
  parsing = seen;
  try {
    value = load(text, { schema: OVERLAY_SCHEMA, listener });
  } catch (e) {
    if (e instanceof YAMLException) {
      return {
        ok: false,
        error: {
          message: e.reason || e.message,
          line: e.mark?.line ?? 0,
          column: e.mark?.column ?? 0,
        },
      };
    }
    return {
      ok: false,
      error: { message: (e as Error).message ?? String(e), line: 0, column: 0 },
    };
  } finally {
    parsing = null;
  }
  const bad = seen.rejected[0];
  if (bad) {
    return {
      ok: false,
      error: {
        message: `${bad.text} ${bad.reason}: quote it to keep it as text`,
        line: bad.line,
        column: bad.column,
      },
    };
  }
  // Only comments: no overlay. An explicit null (`null`, `~`) is not a mapping.
  if (value == null && !seen.content) return { ok: true, value: {} };
  const why = unsupported(value);
  if (why) return { ok: false, error: { message: why, line: 0, column: 0 } };
  if (!isPlainObject(value)) {
    return {
      ok: false,
      error: { message: 'Overlay must be a mapping', line: 0, column: 0 },
    };
  }
  return { ok: true, value };
}
