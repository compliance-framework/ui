// Client-only overlay checks (R89): what the API cannot tell the editor, or tells only after a
// round trip that would fail anyway: a mapping overlay (parsing), masked values copied from a
// report, unquoted plugin config/label scalars (R27, booleans coerced) and the plugin-name
// pattern (O6, NAME_RE: AddPluginDialog checks a name before it is part of any overlay), and
// numbers JSON cannot carry as typed (Infinity / NaN become null, a delete). Every
// other rule (O1–O11) comes from the API's debounced preview (POST …/config/preview); the API
// and the agent stay authoritative.

import { REDACTED_MASK } from '@/types/agent-config';
import type { OverlayDoc } from '@/types/agent-config';
import { clone, isPlainObject, type PlainObject } from './merge-patch';
import { escapeToken, pointer } from './json-pointer';

export interface ClientIssue {
  ptr: string;
  message: string;
  blocking: boolean;
}

/**
 * Plugin names (R28, rule O6). An intentional client-side copy: it must match the API's
 * `PluginNamePattern` exactly.
 */
export const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export const LIMITS = {
  /** Larger drafts are checked on Review only (live preview). */
  overlayBytes: 256 * 1024,
  commentChars: 2000,
} as const;

const encoder = new TextEncoder();

export function byteSize(str: string): number {
  return encoder.encode(str).length;
}

/**
 * R27: plugin config and label values are strings. Converts BOOLEAN values of
 * `plugins.*.config` / `labels` to "true" / "false" (no information is lost). Numbers are left
 * for the blocking "Quote this value" check: `1.0` and `1e3` load as numbers whose String()
 * differs from what was typed. Objects and arrays are left for the (blocking) validation too.
 */
export function coerceStringMaps(overlay: OverlayDoc): {
  overlay: OverlayDoc;
  coerced: string[];
} {
  const coerced: string[] = [];
  const plugins = overlay.plugins;
  if (!isPlainObject(plugins)) return { overlay, coerced };
  let out: OverlayDoc | null = null;
  for (const [name, plugin] of Object.entries(plugins)) {
    if (!isPlainObject(plugin)) continue;
    for (const field of ['config', 'labels'] as const) {
      const map = plugin[field];
      if (!isPlainObject(map)) continue;
      for (const [k, v] of Object.entries(map)) {
        if (typeof v === 'boolean') {
          if (!out) out = clone(overlay);
          (
            ((out.plugins as PlainObject)[name] as PlainObject)[
              field
            ] as PlainObject
          )[k] = String(v);
          coerced.push(pointer('plugins', name, field, k));
        }
      }
    }
  }
  return { overlay: out ?? overlay, coerced };
}

/** True when `n` survives a JSON round trip as typed: finite, and an integer only up to 2^53. */
export function isStorableNumber(n: number): boolean {
  return (
    Number.isFinite(n) &&
    !(Number.isInteger(n) && Math.abs(n) > Number.MAX_SAFE_INTEGER)
  );
}

/** Pointers of every number in `doc` that would not be stored as typed (isStorableNumber). */
export function unstorableNumberPointers(doc: unknown): string[] {
  const out: string[] = [];
  const walk = (ptr: string, v: unknown) => {
    if (typeof v === 'number') {
      if (!isStorableNumber(v)) out.push(ptr);
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(`${ptr}/${i}`, x));
    } else if (isPlainObject(v)) {
      for (const [k, x] of Object.entries(v))
        walk(`${ptr}/${escapeToken(k)}`, x);
    }
  };
  walk('', doc);
  return out;
}

function walkStrings(
  ptr: string,
  value: unknown,
  fn: (ptr: string, s: string) => void,
): void {
  if (typeof value === 'string') {
    fn(ptr, value);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(`${ptr}/${i}`, v, fn));
  } else if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(`${ptr}/${escapeToken(k)}`, v, fn);
    }
  }
}

/**
 * The client-only checks of an overlay (R89). Blocking issues disable Review & save and the
 * live preview.
 */
export function validateOverlayClientSide(overlay: OverlayDoc): ClientIssue[] {
  const issues: ClientIssue[] = [];
  const seen = new Set<string>();
  const add = (ptr: string, message: string, blocking: boolean) => {
    const key = `${ptr}\u0000${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ ptr, message, blocking });
  };
  if (!isPlainObject(overlay)) {
    add('', 'Overlay must be a mapping', true);
    return issues;
  }

  // R27: plugin config and label values are strings.
  const plugins = overlay.plugins;
  if (isPlainObject(plugins)) {
    for (const [name, plugin] of Object.entries(plugins)) {
      if (!isPlainObject(plugin)) continue;
      for (const field of ['config', 'labels'] as const) {
        const map = plugin[field];
        if (!isPlainObject(map)) continue;
        for (const [k, v] of Object.entries(map)) {
          const kptr = pointer('plugins', name, field, k);
          if (isPlainObject(v) || Array.isArray(v)) {
            add(kptr, 'Values must be strings', true);
          } else if (typeof v === 'number' || typeof v === 'boolean') {
            // Only booleans are converted (R27); YAML already lost the original text of a number
            // (0644, 1.0, 1e3, 0x1F), so ask for quotes instead of guessing.
            add(
              kptr,
              'Quote this value: plugin config and label values are strings',
              true,
            );
          }
        }
      }
    }
  }

  // JSON.stringify writes Infinity / NaN as null, which RFC 7396 reads as a delete of that key
  // on every host, and integers above 2^53 lose digits.
  for (const ptr of unstorableNumberPointers(overlay)) {
    add(
      ptr,
      'This number cannot be saved as typed (not finite, or more digits than 2^53); quote it to keep it as text',
      true,
    );
  }

  // R25: a masked value copied from a report would be saved literally.
  for (const ptr of maskedPointers(overlay)) {
    add(ptr, 'This looks like a masked value copied from a report', true);
  }

  return issues;
}

/** Pointers of every string value equal to the report mask ("••••", R25). */
export function maskedPointers(doc: unknown): string[] {
  const out: string[] = [];
  walkStrings('', doc, (ptr, s) => {
    if (s === REDACTED_MASK) out.push(ptr);
  });
  return out;
}

export function hasBlocking(issues: ClientIssue[]): boolean {
  return issues.some((i) => i.blocking);
}
