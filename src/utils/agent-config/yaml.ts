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

/** Parses an overlay document. Empty text is `{}`; a non-mapping root is an error. */
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
  if (!isPlainObject(value)) {
    return {
      ok: false,
      error: { message: 'Overlay must be a mapping', line: 0, column: 0 },
    };
  }
  return { ok: true, value };
}
