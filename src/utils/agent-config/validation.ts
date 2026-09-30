// Client-side overlay checks (LLD U2.6 + U4.6). ADVISORY ONLY: they give fast feedback and
// avoid 422s. The API re-validates everything (API A1.4 O1–O11) and the agent is the
// security boundary.

import { LOCKED_KEYS, REDACTED_MASK } from '@/types/agent-config';
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
import { escapeToken, getAt, parsePointer, pointer } from './json-pointer';
import { validateCron5, GO_DURATION_RE } from './cron5';
import { CORE_SCHEMA, load } from 'js-yaml';

export interface ClientIssue {
  ptr: string;
  message: string;
  blocking: boolean;
}

/** Plugin and bundle names (R28, API PluginNamePattern / BundleNamePattern). */
export const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;
/** API ModulePathPattern (R18). */
export const MODULE_PATH_RE = /^[A-Za-z0-9_\-./]+\.(rego|json|yaml|yml)$/;
/** The only non-Rego files OPA loads from a policy root (R18). */
export const DATA_FILE_RE = /^data\.(json|yaml|yml)$/;
/** Early hint only (R19); the API/agent are authoritative. */
export const FORBIDDEN_BUILTINS =
  /\b(http\.send|net\.lookup_ip_addr|opa\.runtime)\s*\(/;
export const ENV_REF_RE = /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g;
export const FORBIDDEN_ENV_PREFIX = 'CCF_API_AUTH_';
export const INLINE_PREFIX = 'inline:';

export const LIMITS = {
  overlayBytes: 256 * 1024,
  overlayBytesWithBundles: 2 * 1024 * 1024,
  moduleBytes: 256 * 1024,
  bundleBytes: 1024 * 1024,
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

export function envRefs(s: string): string[] {
  return Array.from(s.matchAll(ENV_REF_RE), (m) => m[1]);
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

function isPluginConfigValuePointer(ptr: string): boolean {
  const t = parsePointer(ptr);
  return t.length === 4 && t[0] === 'plugins' && t[2] === 'config';
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

function bundleBytes(b: PolicyBundleDoc): number {
  let total = 0;
  for (const src of Object.values(b.modules ?? {})) {
    if (typeof src === 'string') total += byteSize(src);
  }
  if (isPlainObject(b.data)) total += byteSize(JSON.stringify(b.data));
  return total;
}

/**
 * Advisory validation of an overlay against the known instance bases (or none).
 * Blocking issues disable Review/Save; the rest are hints.
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

  // O3: locked keys, even with a null value.
  for (const key of LOCKED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(overlay, key)) {
      add(
        `/${key}`,
        `${key} is set locally on the agent host and cannot be changed from CCF`,
        true,
      );
    }
  }

  // O2: size of the compact encoding.
  const size = byteSize(JSON.stringify(overlay));
  const hasBundles = overlay.policy_bundles != null;
  const limit = hasBundles
    ? LIMITS.overlayBytesWithBundles
    : LIMITS.overlayBytes;
  if (size > limit) {
    add(
      '',
      `The overlay is ${size} bytes; the limit is ${limit} bytes${hasBundles ? '' : ' without policy bundles'}`,
      true,
    );
  }

  // O5: verbosity.
  if (overlay.verbosity !== undefined && overlay.verbosity !== null) {
    const v = overlay.verbosity;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 2) {
      add(
        '/verbosity',
        'Verbosity must be 0 (Info), 1 (Debug) or 2 (Trace)',
        true,
      );
    }
  }

  const ae = overlay.agent_evidence;
  if (isPlainObject(ae) && typeof ae.interval === 'string') {
    // The API trims, parses as a Go duration and rejects negative values.
    const iv = ae.interval.trim();
    if (!GO_DURATION_RE.test(iv)) {
      add(
        '/agent_evidence/interval',
        'Use a Go duration such as 30s, 5m or 1h',
        true,
      );
    } else if (iv.startsWith('-') && !/^-0+(\.0*)?[a-zµμ]*$/.test(iv)) {
      add(
        '/agent_evidence/interval',
        'The interval must not be negative',
        true,
      );
    }
  }

  // Plugins.
  const plugins = overlay.plugins;
  if (isPlainObject(plugins)) {
    for (const [name, plugin] of Object.entries(plugins)) {
      if (plugin === null) continue;
      const pptr = pointer('plugins', name);
      if (!NAME_RE.test(name)) {
        add(
          pptr,
          'Plugin names use lowercase letters, digits, "_" and "-" (max 63)',
          true,
        );
      }
      if (!isPlainObject(plugin)) {
        add(pptr, 'A plugin must be a mapping', true);
        continue;
      }
      if (typeof plugin.source === 'string') {
        if (plugin.source.trim() === '')
          add(`${pptr}/source`, 'Source must not be empty', true);
        else if (isInlineSource(plugin.source)) {
          add(
            `${pptr}/source`,
            'A plugin source cannot be an inline: bundle',
            true,
          );
        }
      }
      if (typeof plugin.schedule === 'string') {
        const err = validateCron5(plugin.schedule);
        if (err) add(`${pptr}/schedule`, `Invalid schedule: ${err}`, true);
      }
      if (
        plugin.protocol_version !== undefined &&
        plugin.protocol_version !== null
      ) {
        if (plugin.protocol_version !== 1 && plugin.protocol_version !== 2) {
          add(
            `${pptr}/protocol_version`,
            'Protocol must be 1 or 2 (or Auto)',
            true,
          );
        }
      }
      if (Array.isArray(plugin.policies)) {
        plugin.policies.forEach((e, i) => {
          if (typeof e !== 'string' || e.trim() === '') {
            add(
              `${pptr}/policies/${i}`,
              'Policy entries must not be empty',
              true,
            );
          } else if (isInlineSource(e)) {
            const b = inlineBundleName(e);
            if (!b || !NAME_RE.test(b)) {
              add(
                `${pptr}/policies/${i}`,
                `"${e}" must name a bundle matching ${NAME_RE}`,
                true,
              );
            }
          }
        });
      }
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
          if (k === '') add(kptr, 'Keys must not be empty', true);
          if (
            field === 'config' &&
            (k.includes('.') || k !== k.toLowerCase())
          ) {
            add(
              kptr,
              "The agent lowercases and dot-splits keys that come from its file, and globs match case-sensitively; this key may not match the file's key",
              false,
            );
          }
        }
      }
    }
  }

  // O9/O10 + §3.6: every string in the document.
  walkStrings('', overlay, (ptr, s) => {
    if (s === REDACTED_MASK) {
      add(ptr, 'This looks like a masked value copied from a report', true);
    }
    const refs = envRefs(s);
    if (refs.length === 0) return;
    if (!isPluginConfigValuePointer(ptr)) {
      add(
        ptr,
        '${env:…} placeholders are only resolved in plugin config values',
        true,
      );
      return;
    }
    for (const name of refs) {
      if (name.toUpperCase().startsWith(FORBIDDEN_ENV_PREFIX)) {
        add(ptr, `\${env:${name}} is not allowed (agent credentials)`, true);
        continue;
      }
      const isNewRef =
        bases.length === 0 ||
        bases.some((b) => {
          const bv = getAt(b, ptr);
          return typeof bv !== 'string' || !envRefs(bv).includes(name);
        });
      if (isNewRef)
        add(
          ptr,
          `Reads a host secret (\${env:${name}}); needs apply_all`,
          false,
        );
    }
  });

  validateBundles(overlay, bases, ctx, add);
  return issues;
}

function validateBundles(
  overlay: OverlayDoc,
  bases: ConfigDoc[],
  ctx: ValidationContext,
  add: (ptr: string, message: string, blocking: boolean) => void,
): void {
  const ob = overlay.policy_bundles;
  if (ob !== undefined && ob !== null && !isPlainObject(ob)) {
    add('/policy_bundles', 'policy_bundles must be a mapping', true);
    return;
  }
  // Overlay-level (shape) checks.
  if (isPlainObject(ob)) {
    for (const [name, bundle] of Object.entries(ob)) {
      if (bundle === null) continue;
      const bptr = pointer('policy_bundles', name);
      if (!NAME_RE.test(name)) {
        add(
          bptr,
          'Bundle names use lowercase letters, digits, "_" and "-" (max 63)',
          true,
        );
      }
      if (!isPlainObject(bundle)) {
        add(bptr, 'A bundle must be a mapping', true);
        continue;
      }
      const b = bundle as PolicyBundleDoc;
      if (typeof b.extends === 'string' && isInlineSource(b.extends)) {
        add(
          `${bptr}/extends`,
          'A bundle cannot extend another inline bundle',
          true,
        );
      }
      for (const [path, src] of Object.entries(b.modules ?? {})) {
        const mptr = pointer('policy_bundles', name, 'modules', path);
        if (src === null) continue;
        const perr = modulePathError(path);
        if (perr) add(mptr, perr, true);
        if (typeof src !== 'string') {
          add(mptr, 'Module content must be text', true);
          continue;
        }
        const size = byteSize(src);
        if (size > LIMITS.moduleBytes) {
          add(
            mptr,
            `Module is ${size} bytes; the limit is ${LIMITS.moduleBytes}`,
            true,
          );
        }
        if (!path.endsWith('.rego') && src.trim() !== '') {
          const parseErr = dataParseError(path, src);
          if (parseErr)
            add(mptr, `The data file does not parse: ${parseErr}`, true);
        }
        if (path.endsWith('.rego')) {
          if (!packageOf(src))
            add(mptr, 'The module has no package line', false);
          if (FORBIDDEN_BUILTINS.test(src)) {
            add(
              mptr,
              'Calls http.send, net.lookup_ip_addr or opa.runtime, which agents refuse to run',
              false,
            );
          }
        }
      }
      for (const [i, p] of (Array.isArray(b.delete)
        ? b.delete
        : []
      ).entries()) {
        const perr =
          typeof p === 'string' ? modulePathError(p) : 'Must be a path';
        if (perr)
          add(pointer('policy_bundles', name, 'delete', String(i)), perr, true);
      }
    }
  }

  // Effective checks, per known base (or none). Like the API (R59, splitIntroduced), only
  // problems the overlay INTRODUCES block: anything already present in merge(base, {}) comes
  // from the host's own file and is reported as a non-blocking hint.
  const standalone = bases.length === 0;
  for (const base of standalone ? [{}] : bases) {
    const before = new Set(
      effectiveIssues(mergePatch<ConfigDoc>(base, {}), {}, ctx, standalone).map(
        issueKey,
      ),
    );
    for (const i of effectiveIssues(
      mergePatch<ConfigDoc>(base, overlay),
      overlay,
      ctx,
      standalone,
    )) {
      if (before.has(issueKey(i))) {
        add(i.ptr, `${i.message} (already in the agent's file)`, false);
      } else {
        add(i.ptr, i.message, i.blocking);
      }
    }
  }
}

function issueKey(i: ClientIssue): string {
  return `${i.ptr}\u0000${i.message}`;
}

/** Problems of one effective config (merge of a base and the overlay). */
function effectiveIssues(
  eff: ConfigDoc,
  overlay: OverlayDoc,
  ctx: ValidationContext,
  standalone: boolean,
): ClientIssue[] {
  const out: ClientIssue[] = [];
  const add = (ptr: string, message: string, blocking: boolean) =>
    out.push({ ptr, message, blocking });

  // Plugins the overlay touches must end up with a source. With no known base the API runs
  // overlay-only checks (standalone), so this is only a hint then.
  const ovPlugins = isPlainObject(overlay.plugins) ? overlay.plugins : {};
  for (const [pname, ov] of Object.entries(ovPlugins)) {
    const plugin = eff.plugins?.[pname];
    if (ov === null || !isPlainObject(plugin)) continue;
    if (typeof plugin.source !== 'string' || plugin.source.trim() === '') {
      add(
        pointer('plugins', pname, 'source'),
        standalone
          ? 'Needs a source unless the agent file defines this plugin'
          : 'A plugin needs a source (not defined by this agent file)',
        !standalone,
      );
    }
  }

  const bundles = eff.policy_bundles ?? {};
  for (const [name, raw] of Object.entries(bundles)) {
    if (!isPlainObject(raw)) continue;
    const b = raw as PolicyBundleDoc;
    const bptr = pointer('policy_bundles', name);
    const modules = (b.modules ?? {}) as Record<string, string>;
    const hasExtends = typeof b.extends === 'string' && b.extends.trim() !== '';
    const hasModules = Object.keys(modules).length > 0;
    const hasData = isPlainObject(b.data);
    if (typeof b.extends === 'string' && b.extends.trim() === '') {
      add(`${bptr}/extends`, 'extends must not be empty', true);
    }
    if (!hasExtends && !hasModules && !hasData) {
      add(bptr, 'A bundle needs extends, modules or data', true);
    }
    if (hasData && Object.keys(modules).some((p) => DATA_FILE_RE.test(p))) {
      add(
        `${bptr}/data`,
        'Set either data or a root data.json / data.yaml / data.yml module, not both',
        true,
      );
    }
    const del = Array.isArray(b.delete) ? b.delete : [];
    if (del.length > 0 && !hasExtends) {
      add(`${bptr}/delete`, 'Deleting files requires extends', true);
    }
    for (const p of del) {
      if (Object.prototype.hasOwnProperty.call(modules, p)) {
        add(
          pointer('policy_bundles', name, 'modules', p),
          'This file is both overridden and deleted',
          true,
        );
      }
    }
    const total = bundleBytes(b);
    if (total > LIMITS.bundleBytes) {
      add(
        bptr,
        `Bundle is ${total} bytes; the limit is ${LIMITS.bundleBytes}`,
        true,
      );
    }
    // R21: imports across bundles are not supported (hint, overlay bundles only).
    const own = new Set(
      Object.entries(modules)
        .filter(([p, src]) => p.endsWith('.rego') && typeof src === 'string')
        .map(([, src]) => packageOf(src))
        .filter((p): p is string => !!p),
    );
    const vendor = ctx.vendorPackages?.(name) ?? null;
    const inOverlay =
      isPlainObject(overlay.policy_bundles) &&
      isPlainObject((overlay.policy_bundles as PlainObject)[name]);
    for (const [path, src] of Object.entries(modules)) {
      if (!inOverlay || !path.endsWith('.rego') || typeof src !== 'string')
        continue;
      for (const imp of importedDataPackages(src)) {
        const known = [...own, ...(vendor ?? [])];
        const resolves = known.some(
          (pkg) => imp === pkg || imp.startsWith(`${pkg}.`),
        );
        if (!resolves && (vendor !== null || !hasExtends)) {
          add(
            pointer('policy_bundles', name, 'modules', path),
            `import data.${imp}: imports across bundles are not supported`,
            false,
          );
        }
      }
    }
  }
  // Plugin references.
  for (const [pname, plugin] of Object.entries(eff.plugins ?? {})) {
    if (!isPlainObject(plugin) || !Array.isArray(plugin.policies)) continue;
    const pols = plugin.policies as string[];
    pols.forEach((e) => {
      const b = typeof e === 'string' ? inlineBundleName(e) : null;
      if (b && !isPlainObject(bundles[b])) {
        add(
          pointer('plugins', pname, 'policies'),
          `${e} has no bundle named "${b}"`,
          true,
        );
      }
      if (b && isPlainObject(bundles[b])) {
        const ext = (bundles[b] as PolicyBundleDoc).extends;
        if (typeof ext === 'string' && pols.includes(ext)) {
          add(
            pointer('plugins', pname, 'policies'),
            `Both the vendor bundle ${ext} and its customized copy ${e} are loaded`,
            false,
          );
        }
      }
    });
  }
  return out;
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
