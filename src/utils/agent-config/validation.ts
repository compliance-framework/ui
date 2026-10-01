// Client-only overlay checks (R89): what the API cannot tell the editor, or tells only after a
// round trip that would fail anyway: a mapping overlay, masked values copied from a report,
// unquoted plugin config/label scalars (R27), data files that do not parse, and imports across
// bundles (hint). Every other rule (O1–O11, the Rego contract) comes from the API's debounced
// preview (POST …/config/preview); the API and the agent stay authoritative.

import { REDACTED_MASK } from '@/types/agent-config';
import type {
  ConfigDoc,
  OverlayDoc,
  PolicyBundleDoc,
} from '@/types/agent-config';
import {
  clone,
  isPlainObject,
  mergePatch,
  type PlainObject,
} from './merge-patch';
import { escapeToken, pointer } from './json-pointer';
import { CORE_SCHEMA, load } from 'js-yaml';

export interface ClientIssue {
  ptr: string;
  message: string;
  blocking: boolean;
}

/** Plugin and bundle names (R28, API PluginNamePattern / BundleNamePattern). */
export const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;
/** API ModulePathPattern (R18). */
const MODULE_PATH_RE = /^[A-Za-z0-9_\-./]+\.(rego|json|yaml|yml)$/;
/** The only non-Rego files OPA loads from a policy root (R18). */
export const DATA_FILE_RE = /^data\.(json|yaml|yml)$/;
const INLINE_PREFIX = 'inline:';

export const LIMITS = {
  /** Larger drafts are checked on Review only (live preview). */
  overlayBytes: 256 * 1024,
  moduleBytes: 256 * 1024,
  commentChars: 2000,
} as const;

const encoder = new TextEncoder();

export function byteSize(str: string): number {
  return encoder.encode(str).length;
}

export function isInlineSource(s: string): boolean {
  return s.startsWith(INLINE_PREFIX);
}

export function inlineBundleName(s: string): string | null {
  if (!isInlineSource(s)) return null;
  const n = s.slice(INLINE_PREFIX.length);
  return n === '' ? null : n;
}

function basename(p: string): string {
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(i + 1) : p;
}

/** Mirrors agentconfig.ValidateModulePath. Returns an error message or null. */
export function modulePathError(p: string): string | null {
  if (!MODULE_PATH_RE.test(p)) {
    return 'Module paths use letters, digits, "_", "-", "." and "/", and end in .rego, .json, .yaml or .yml';
  }
  if (p.startsWith('/'))
    return 'Module paths are relative to the policy root (no leading "/")';
  if (p.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) {
    return 'Module paths must not contain empty, "." or ".." segments';
  }
  if (!p.endsWith('.rego') && !DATA_FILE_RE.test(basename(p))) {
    return 'Only .rego modules and data.json, data.yaml or data.yml data files are loaded';
  }
  return null;
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

export interface ValidationContext {
  /** Known vendor packages per bundle name (from instance reports), for the import hint. */
  vendorPackages?: (bundle: string) => string[] | null;
}

function packageOf(src: string): string | null {
  const m = /^\s*package\s+([A-Za-z0-9_.[\]"]+)/m.exec(src);
  return m ? m[1] : null;
}

function importedDataPackages(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*import\s+data\.([A-Za-z0-9_.]+)/gm)) {
    out.push(m[1]);
  }
  return out;
}

function dataParseError(path: string, src: string): string | null {
  try {
    if (path.endsWith('.json')) JSON.parse(src);
    else load(src, { schema: CORE_SCHEMA });
    return null;
  } catch (e) {
    return e instanceof Error
      ? (e.message.split('\n')[0] ?? 'invalid')
      : 'invalid';
  }
}

/**
 * The client-only checks of an overlay (R89). Blocking issues disable Review & save and the
 * live preview; the rest are hints. `bases` (the instances' files) only resolve the import
 * hint against file-defined modules.
 */
export function validateOverlayClientSide(
  overlay: OverlayDoc,
  bases: ConfigDoc[] = [],
  ctx: ValidationContext = {},
): ClientIssue[] {
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

  const ob = overlay.policy_bundles;
  if (!isPlainObject(ob)) return issues;
  for (const [name, bundle] of Object.entries(ob)) {
    if (!isPlainObject(bundle)) continue;
    for (const [path, src] of Object.entries(
      (bundle as PolicyBundleDoc).modules ?? {},
    )) {
      if (typeof src !== 'string' || path.endsWith('.rego') || !src.trim())
        continue;
      const err = dataParseError(path, src);
      if (err)
        add(
          pointer('policy_bundles', name, 'modules', path),
          `The data file does not parse: ${err}`,
          true,
        );
    }
    for (const base of bases.length ? bases : [{}]) {
      importHints(name, mergePatch<ConfigDoc>(base, overlay), ctx, add);
    }
  }
  return issues;
}

/** R21: imports across bundles are not supported (hint for the overlay's modules). */
function importHints(
  name: string,
  eff: ConfigDoc,
  ctx: ValidationContext,
  add: (ptr: string, message: string, blocking: boolean) => void,
): void {
  const b = eff.policy_bundles?.[name];
  if (!isPlainObject(b)) return;
  const modules = (b.modules ?? {}) as Record<string, string>;
  const hasExtends = typeof b.extends === 'string' && b.extends.trim() !== '';
  const own = Object.entries(modules)
    .filter(([p, src]) => p.endsWith('.rego') && typeof src === 'string')
    .map(([, src]) => packageOf(src))
    .filter((p): p is string => !!p);
  const vendor = ctx.vendorPackages?.(name) ?? null;
  if (vendor === null && hasExtends) return;
  const known = [...own, ...(vendor ?? [])];
  for (const [path, src] of Object.entries(modules)) {
    if (!path.endsWith('.rego') || typeof src !== 'string') continue;
    for (const imp of importedDataPackages(src)) {
      if (!known.some((pkg) => imp === pkg || imp.startsWith(`${pkg}.`)))
        add(
          pointer('policy_bundles', name, 'modules', path),
          `import data.${imp}: imports across bundles are not supported`,
          false,
        );
    }
  }
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
