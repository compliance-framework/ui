// YAML rendering and parsing of config documents. CORE_SCHEMA everywhere (design 12.6), so
// timestamps stay strings and `yes`/`no` are not booleans.

import { CORE_SCHEMA, dump, load, YAMLException } from 'js-yaml';
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
 * Parses an overlay document. Empty text is `{}`; a non-mapping root, an alias of a mapping or
 * sequence, and a `<<` merge key are errors.
 */
export function parseYaml(text: string): ParseYamlResult {
  if (text.trim() === '') return { ok: true, value: {} };
  let value: unknown;
  try {
    value = load(text, { schema: CORE_SCHEMA });
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
  }
  if (value === null || value === undefined) return { ok: true, value: {} };
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
