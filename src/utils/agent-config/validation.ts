// Client-only overlay checks (R89): what the API cannot tell the editor, or tells only after a
// round trip that would fail anyway: a mapping overlay, masked values copied from a report and
// unquoted plugin config/label scalars (R27). Every other rule (O1–O11) comes from the API's
// debounced preview (POST …/config/preview); the API and the agent stay authoritative.

import { REDACTED_MASK } from '@/types/agent-config';
import type { OverlayDoc } from '@/types/agent-config';
import { clone, isPlainObject, type PlainObject } from './merge-patch';
import { escapeToken, pointer } from './json-pointer';

export interface ClientIssue {
  ptr: string;
  message: string;
  blocking: boolean;
}

/** Plugin names (R28, API PluginNamePattern). */
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
 * R27: YAML `port: 2222` must be sent as "2222". Converts number/boolean values of
 * `plugins.*.config` / `labels` to strings. Objects and arrays are left for the (blocking)
 * validation.
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
        if (
          typeof v === 'boolean' ||
          (typeof v === 'number' && Number.isSafeInteger(v))
        ) {
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
            // Only whole numbers and booleans are converted safely (R27); YAML already lost the
            // original text of 1.10 or 1e3, so ask for quotes instead of guessing.
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
