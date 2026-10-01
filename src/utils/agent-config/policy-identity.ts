// Evidence identity of policy modules (design §13.4: R74 policy_id, R77 plugin-path, R78;
// §13.5: R82 automatic continuity policy_id).
//
// Plugins seed each evidence UUID with the policy's file (the path the agent passed them,
// joined with the module's path and cleaned by OPA's loader) and the literal policy path.
// A module may declare `policy_id := "<string>"`; api policyeval.SeedPath then replaces both
// seed values, so the stream follows the policy instead of its location. seedPath below is a
// port of SeedPath (api#465), so the UI, the API and the agent agree on which stream a module
// writes to.
//
// ADVISORY: like contract-hints, the policy_id and package are read line by line, never by
// parsing Rego. The agent's checks (policy-stream-forked, policy-package-changed) decide, and
// the agent itself appends the continuity policy_id to modules that continue a vendor file
// (R82); the UI only mirrors that rule to label streams and warn about forks.

import type { PolicyBundleReport } from '@/types/agent-config';

/** api policyeval.MaxPolicyIDLength (characters). */
export const MAX_POLICY_ID_LENGTH = 512;

/** Go's path.Clean for slash-separated paths. */
export function cleanPath(p: string): string {
  if (p === '') return '.';
  const rooted = p.startsWith('/');
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else if (!rooted) out.push('..');
      continue;
    }
    out.push(part);
  }
  const s = (rooted ? '/' : '') + out.join('/');
  return s === '' ? '.' : s;
}

/** Go's path.Join: the non-empty elements joined with "/" and cleaned ("" when none). */
export function joinPath(...elems: string[]): string {
  const parts = elems.filter((e) => e !== '');
  return parts.length ? cleanPath(parts.join('/')) : '';
}

/** policyeval.ValidPolicyID: non-empty, at most 512 characters. */
export function validPolicyId(id: string | null | undefined): id is string {
  return (
    typeof id === 'string' &&
    id !== '' &&
    Array.from(id).length <= MAX_POLICY_ID_LENGTH
  );
}

/** policyFile relative to the cleaned policyPath, or '' (policyeval bundleRelative). */
function bundleRelative(policyFile: string, policyPath: string): string {
  if (!policyPath) return '';
  const dir = cleanPath(policyPath);
  if (dir === '.') {
    if (
      policyFile.startsWith('/') ||
      policyFile === '..' ||
      policyFile.startsWith('../')
    )
      return '';
    return policyFile;
  }
  const prefix = `${dir.replace(/\/$/, '')}/`;
  return policyFile.startsWith(prefix) ? policyFile.slice(prefix.length) : '';
}

/**
 * policyeval.SeedPath: the `policy_file` and `_policy_path` values a plugin seeds a policy's
 * evidence UUID with. `policyFile` is the cleaned file OPA reports, `policyPath` the literal
 * path the agent passed the plugin.
 */
export function seedPath(
  policyId: string | null | undefined,
  policyFile: string,
  policyPath: string,
): [file: string, path: string] {
  if (
    !validPolicyId(policyId) ||
    policyId === policyFile ||
    cleanPath(policyId) === policyFile
  ) {
    return [policyFile, policyPath];
  }
  const seedFile = cleanPath(policyId);
  const rel = bundleRelative(policyFile, policyPath);
  if (rel && policyId.endsWith(`/${rel}`)) {
    return [seedFile, policyId.slice(0, policyId.length - rel.length - 1)];
  }
  return [seedFile, policyId];
}

/**
 * The policy_id that makes a module at `file` continue the evidence stream of the module at
 * `file` under plugin path `pluginPath` when that one declares none (R77 correction): the
 * LITERAL `<plugin-path>/<file>`, not path.Join, so an un-cleaned plugin path such as "./x"
 * or "x/" survives in the `_policy_path` seed. R82: the agent appends exactly this id itself.
 */
export function continuityPolicyId(pluginPath: string, file: string): string {
  return `${pluginPath}/${file}`;
}

/** The policy_id a new module gets (R78): `<bundle>/<file>`, stable from day one. */
export function newModulePolicyId(bundle: string, file: string): string {
  return `${bundle}/${file}`;
}

/** The `plugin-path` an instance reported for policy source `source` (first one wins). */
export function pluginPathFor(
  source: string,
  reportSets: (PolicyBundleReport[] | null | undefined)[],
): string | null {
  for (const reports of reportSets) {
    const hit = (reports ?? []).find(
      (r) => r.source === source && typeof r.pluginPath === 'string',
    );
    if (hit?.pluginPath) return hit.pluginPath;
  }
  return null;
}

/**
 * The plugin path a continuity policy_id of inline bundle `bundle` builds on for the source
 * `source` it extends (R77/R78), or null. In order: the `plugin-path` of a report entry that
 * loads the source directly; else the `extends.plugin-path` of the bundle's own report entry
 * (api#465: where plugins would load the source, reported even after the bundle replaced it
 * in every plugin); else that of any other inline bundle extending the same source.
 */
export function vendorPluginPathFor(
  source: string,
  bundle: string,
  reportSets: (PolicyBundleReport[] | null | undefined)[],
): string | null {
  const direct = pluginPathFor(source, reportSets);
  if (direct) return direct;
  const all = reportSets.flatMap((r) => r ?? []);
  const ext = (r: PolicyBundleReport) =>
    r.extends?.source === source && typeof r.extends.pluginPath === 'string'
      ? r.extends.pluginPath
      : '';
  const own = `inline:${bundle}`;
  for (const r of all) if (r.source === own && ext(r)) return ext(r);
  for (const r of all) if (ext(r)) return ext(r);
  return null;
}

// ---- Reading a module (line based) ----

/** Removes a trailing `# comment` outside double-quoted strings. */
function stripComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && inString) {
      i++;
      continue;
    }
    if (c === '"') inString = !inString;
    else if (c === '#' && !inString) return line.slice(0, i);
  }
  return line;
}

/** The module's package (without "data.") and its 1-based row, or null. */
export function modulePackage(
  src: string,
): { pkg: string; row: number } | null {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*package\s+([A-Za-z0-9_.]+)\s*$/.exec(stripComment(lines[i]));
    if (m) return { pkg: m[1].replace(/^data\./, ''), row: i + 1 };
  }
  return null;
}

/** A top-level `policy_id` rule head. */
export interface PolicyIdRule {
  row: number;
  col: number;
  /** The literal string value when the rule is `policy_id := "<literal>"`, else null. */
  literal: string | null;
  /** Why the rule is not a valid policy_id declaration ('' when it is). */
  problem: string;
}

const POLICY_ID_SHAPE = 'declare it as `policy_id := "..."`';

function parseStringLiteral(v: string): string | null {
  const s = v.trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(s)) {
    try {
      return JSON.parse(s) as string;
    } catch {
      return null;
    }
  }
  const raw = /^`([^`]*)`$/.exec(s);
  return raw ? raw[1] : null;
}

/** Every top-level (column 1) `policy_id` rule head of a module. */
export function policyIdRules(src: string): PolicyIdRule[] {
  const out: PolicyIdRule[] = [];
  src.split('\n').forEach((raw, idx) => {
    const line = stripComment(raw).replace(/\s+$/, '');
    const m = /^(default\s+)?policy_id\b(.*)$/.exec(line);
    if (!m) return;
    const rest = m[2];
    const row = idx + 1;
    const col = 1;
    if (m[1]) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must not be a default rule; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const assign = /^\s*(:=|=(?!=))\s*(.*)$/.exec(rest);
    if (!assign) {
      // policy_id(x), policy_id[k], policy_id contains, policy_id if { … }
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be a single string; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const value = assign[2];
    if (/\bif\b|\{\s*$/.test(value.replace(/"(?:[^"\\]|\\.)*"/g, '""'))) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be unconditional, since it decides which evidence stream the policy writes to; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const literal = parseStringLiteral(value);
    if (literal === null) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be a string literal; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    let problem = '';
    if (literal === '') problem = 'policy_id must not be empty';
    else if (Array.from(literal).length > MAX_POLICY_ID_LENGTH)
      problem = `policy_id must be at most ${MAX_POLICY_ID_LENGTH} characters`;
    out.push({ row, col, literal, problem });
  });
  return out;
}

/**
 * The policy_id a module declares: the literal of its only `policy_id` rule when that one is
 * valid, else null (none, or not a valid declaration — the contract hints say why).
 */
export function declaredPolicyId(src: string): string | null {
  const rules = policyIdRules(src);
  return rules.length === 1 && !rules[0].problem ? rules[0].literal : null;
}

/** Whether the module has any top-level `policy_id` rule (valid or not). */
export function hasPolicyIdRule(src: string): boolean {
  return policyIdRules(src).length > 0;
}

// ---- Stream identity (R78, R82) ----
//
// R82 (design §13.5): while materializing an inline bundle that `extends` a source, the AGENT
// appends `policy_id := "<extends.plugin-path>/<rel>"` to every non-test module that continues
// a vendor file (inherited unchanged, or overridden at the same path with the same package)
// and declares no policy_id, unless its package has more than one non-test module. So those
// modules keep the vendor's stream with no user action; the UI only labels them and warns
// when an edit forks the stream.

/** Which evidence stream a module writes to. */
export type StreamKind = 'automatic' | 'continues' | 'own' | 'new' | 'path';

export const STREAM_LABELS: Record<StreamKind, string> = {
  automatic: 'continues vendor stream (automatic)',
  continues: 'continues vendor stream',
  own: 'own stream (policy_id)',
  new: 'new stream',
  path: 'new stream (path-based)',
};

/** Why a module that replaces or inherits a vendor module does not continue its stream. */
export type ForkReason =
  /** The package line differs from the vendor module's. */
  | 'package'
  /** The policy_id differs from the one that continues the stream. */
  | 'policy-id'
  /** No policy_id, but the vendor module declares one (`expected`): the agent's id differs. */
  | 'no-policy-id'
  /** The package has more than one non-test module: the agent adds no policy_id (R82). */
  | 'multi-module';

export interface StreamFork {
  reason: ForkReason;
  /** The policy_id that would continue the vendor stream, when known. */
  expected: string | null;
  /** The vendor package (reason 'package'). */
  vendorPackage?: string;
  /** The module's package (reasons 'package' and 'multi-module'). */
  package?: string;
  /** The package's non-test modules (reason 'multi-module'). */
  modules?: string[];
}

export interface StreamIdentity {
  kind: StreamKind;
  /** The module's declared policy_id, or null. */
  policyId: string | null;
  /** R82: the policy_id the agent appends (kind 'automatic'), when the plugin path is known. */
  automaticId?: string | null;
  /** For a module that does not continue the vendor stream it replaces or inherits. */
  fork: StreamFork | null;
}

export interface VendorContext {
  /** The vendor module's package, when reported. */
  vendorPackage?: string | null;
  /** The vendor module's source; undefined = not loaded (its policy_id is unknown). */
  vendorSource?: string | null;
  /** The plugin path of the source the bundle extends (R77), or null when unreported. */
  vendorPluginPath: string | null;
  /** The plugin path of the bundle itself, or null (the R82 inline path is assumed). */
  bundlePluginPath: string | null;
  /**
   * The non-test `.rego` modules of the bundle as plugins load it (vendor files included)
   * that share this module's package; more than one = the agent skips its policy_id (R82).
   */
  packageModules?: string[];
}

/** R82 (b): the relative path plugins load inline bundle `bundle` from. */
export function inlinePluginPath(bundle: string): string {
  return `.compliance-framework/policies/inline/${bundle}/policies`;
}

function vendorIdOf(ctx: VendorContext): string | null | undefined {
  // undefined = vendor source not loaded; null = the vendor declares no policy_id.
  return typeof ctx.vendorSource === 'string'
    ? declaredPolicyId(ctx.vendorSource)
    : undefined;
}

function multiModuleFork(
  ctx: VendorContext,
  pkg: string | null,
  expected: string | null,
): StreamFork | null {
  const mods = ctx.packageModules ?? [];
  if (mods.length <= 1) return null;
  return {
    reason: 'multi-module',
    expected,
    ...(pkg ? { package: pkg } : {}),
    modules: [...mods].sort(),
  };
}

/**
 * Whether policy_id `id` of the module at `path` in the bundle writes to the same stream as
 * the vendor module at `path` (declaring `vendorId`, or none), by the policyeval.SeedPath
 * port; null when the vendor plugin path is unknown.
 */
function continuesVendor(
  id: string,
  vendorId: string | null | undefined,
  path: string,
  bundle: string,
  ctx: VendorContext,
): boolean | null {
  const vp = ctx.vendorPluginPath;
  if (vp === null) {
    return typeof vendorId === 'string' ? id === vendorId : null;
  }
  const bp = ctx.bundlePluginPath || inlinePluginPath(bundle);
  const [vf, vpath] = seedPath(vendorId ?? '', joinPath(vp, path), vp);
  const [of, opath] = seedPath(id, joinPath(bp, path), bp);
  return vf === of && vpath === opath;
}

/**
 * The stream identity of authored module `path` of bundle `bundle` with text `src`. Pass
 * `override` when the module replaces a vendor module at the same path (an extends bundle).
 */
export function streamIdentity(
  bundle: string,
  path: string,
  src: string,
  override?: VendorContext | null,
): StreamIdentity {
  const policyId = declaredPolicyId(src);
  if (!override)
    return { kind: policyId ? 'own' : 'path', policyId, fork: null };

  const pkg = modulePackage(src)?.pkg ?? null;
  const vendorPackage =
    override.vendorPackage ??
    (typeof override.vendorSource === 'string'
      ? (modulePackage(override.vendorSource)?.pkg ?? null)
      : null);
  if (vendorPackage && pkg && vendorPackage !== pkg) {
    // Not a continuation of the vendor file: the agent adds nothing (R82).
    return {
      kind: policyId ? 'own' : 'new',
      policyId,
      fork: {
        reason: 'package',
        expected: null,
        vendorPackage,
        package: pkg,
      },
    };
  }

  const vendorId = vendorIdOf(override);
  const vp = override.vendorPluginPath;
  const continuity = vp !== null ? continuityPolicyId(vp, path) : null;
  const expected = vendorId ?? continuity;

  if (policyId) {
    // An explicit policy_id always wins (R82).
    const same = continuesVendor(policyId, vendorId, path, bundle, override);
    if (same === true) return { kind: 'continues', policyId, fork: null };
    if (same === false)
      return { kind: 'own', policyId, fork: { reason: 'policy-id', expected } };
    // Neither the vendor plugin path nor a vendor policy_id: cannot tell.
    return { kind: 'own', policyId, fork: null };
  }

  const multi = multiModuleFork(override, pkg ?? vendorPackage, expected);
  if (multi) return { kind: 'path', policyId, fork: multi };
  if (typeof vendorId === 'string') {
    // The agent appends the continuity id, which only keeps a vendor stream that has none.
    const same =
      continuity !== null
        ? continuesVendor(continuity, vendorId, path, bundle, override)
        : false;
    if (!same)
      return {
        kind: 'new',
        policyId,
        fork: { reason: 'no-policy-id', expected: vendorId },
      };
  }
  return { kind: 'automatic', policyId, automaticId: continuity, fork: null };
}

/**
 * The stream identity of vendor module `path`, inherited unchanged by an extends bundle
 * (R82): the vendor's own policy_id when it declares one, else the agent's automatic one,
 * unless its package has several modules (then the agent skips it and the stream forks).
 */
export function inheritedStreamIdentity(
  path: string,
  ctx: VendorContext,
): StreamIdentity {
  const vendorId = vendorIdOf(ctx);
  if (vendorId) return { kind: 'continues', policyId: vendorId, fork: null };
  const pkg =
    ctx.vendorPackage ??
    (typeof ctx.vendorSource === 'string'
      ? (modulePackage(ctx.vendorSource)?.pkg ?? null)
      : null);
  const continuity =
    ctx.vendorPluginPath !== null
      ? continuityPolicyId(ctx.vendorPluginPath, path)
      : null;
  const multi = multiModuleFork(ctx, pkg, continuity);
  if (multi) return { kind: 'path', policyId: null, fork: multi };
  return {
    kind: 'automatic',
    policyId: null,
    automaticId: continuity,
    fork: null,
  };
}

/** The editor warning for a module that forks the vendor stream. */
export function forkMessage(fork: StreamFork, policyId: string | null): string {
  switch (fork.reason) {
    case 'package':
      return `The override changes the package from ${fork.vendorPackage} to ${fork.package}: this starts a new evidence stream. Keep \`package ${fork.vendorPackage}\` to continue the vendor policy's stream.`;
    case 'policy-id':
      return `policy_id ${JSON.stringify(policyId)} does not continue the vendor policy's evidence stream: this starts a new evidence stream.${fork.expected ? ` Declare \`policy_id := ${JSON.stringify(fork.expected)}\`, or remove it to let the agent continue the stream automatically.` : ''}`;
    case 'no-policy-id':
      return `The vendor module declares policy_id ${JSON.stringify(fork.expected)} and the override has none: the agent's automatic policy_id starts a new evidence stream. Keep \`policy_id := ${JSON.stringify(fork.expected)}\` to continue the vendor policy's stream.`;
    case 'multi-module':
      return `Package ${fork.package ?? '(unknown)'} has more than one module (${(fork.modules ?? []).join(', ')}): the agent does not add the continuity policy_id here (it would conflict), so this module's evidence starts a new, path-based stream. Declare a policy_id for the package to choose its stream.`;
  }
}
