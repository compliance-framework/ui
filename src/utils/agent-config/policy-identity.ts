// Evidence identity of policy modules (design §13.4: R74 policy_id, R77 plugin-path, R78).
//
// Plugins seed each evidence UUID with the policy's file (the path the agent passed them,
// joined with the module's path and cleaned by OPA's loader) and the literal policy path.
// A module may declare `policy_id := "<string>"`; api policyeval.SeedPath then replaces both
// seed values, so the stream follows the policy instead of its location. seedPath below is a
// port of SeedPath (api#465), so the UI, the API and the agent agree on which stream a module
// writes to.
//
// ADVISORY: like contract-hints, the policy_id and package are read line by line, never by
// parsing Rego. The agent's checks (policy-stream-forked, policy-package-changed) decide.

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
 * or "x/" survives in the `_policy_path` seed.
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

/**
 * Inserts `policy_id := "<id>"` after the module's imports (after the package line when it
 * has none). A module that already has a policy_id rule is returned unchanged.
 */
export function insertPolicyId(src: string, id: string): string {
  if (hasPolicyIdRule(src)) return src;
  const lines = src.split('\n');
  const pkg = modulePackage(src);
  let at = pkg ? pkg.row : 0; // index after which to insert (1-based row → index)
  for (let i = at; i < lines.length; i++) {
    const l = stripComment(lines[i]).trim();
    if (l === '') continue;
    if (/^import\s/.test(l)) {
      at = i + 1;
      continue;
    }
    break;
  }
  const decl = `policy_id := ${JSON.stringify(id)}`;
  const before = lines.slice(0, at);
  const after = lines.slice(at);
  // One blank line between the imports and the declaration, and after it.
  while (before.length && before[before.length - 1].trim() === '') before.pop();
  while (after.length && after[0].trim() === '') after.shift();
  return [...before, '', decl, '', ...after].join('\n');
}

// ---- Stream identity (R78) ----

/** Which evidence stream a module writes to. */
export type StreamKind = 'continues' | 'own' | 'path';

export const STREAM_LABELS: Record<StreamKind, string> = {
  continues: 'continues vendor stream',
  own: 'own stream (policy_id)',
  path: 'new stream (path-based)',
};

/** Why an override does not continue the vendor policy's stream. */
export type ForkReason =
  /** The package line differs from the vendor module's. */
  | 'package'
  /** The policy_id differs from the one that continues the stream. */
  | 'policy-id'
  /** No policy_id; `expected` would continue the stream. */
  | 'no-policy-id'
  /** No policy_id, and no instance reported the vendor plugin path (R77). */
  | 'unknown-plugin-path';

export interface StreamIdentity {
  kind: StreamKind;
  /** The module's declared policy_id, or null. */
  policyId: string | null;
  /** For an override that forks the vendor stream. */
  fork: {
    reason: ForkReason;
    /** The policy_id that would continue the vendor stream, when known. */
    expected: string | null;
    /** The vendor package (reason 'package'). */
    vendorPackage?: string;
    /** The override's package (reason 'package'). */
    package?: string;
  } | null;
}

export interface OverrideContext {
  /** The vendor module's package, when reported. */
  vendorPackage?: string | null;
  /** The vendor module's source; undefined = not loaded (its policy_id is unknown). */
  vendorSource?: string | null;
  /** The plugin path of the source the bundle replaces (R77), or null when unreported. */
  vendorPluginPath: string | null;
  /** The plugin path of the bundle itself, or null (a stand-in is used). */
  bundlePluginPath: string | null;
}

/**
 * The stream identity of module `path` of bundle `bundle` with text `src`. Pass `override`
 * when the module replaces a vendor module at the same path (an extends bundle).
 */
export function streamIdentity(
  bundle: string,
  path: string,
  src: string,
  override?: OverrideContext | null,
): StreamIdentity {
  const policyId = declaredPolicyId(src);
  const own: StreamKind = policyId ? 'own' : 'path';
  if (!override) return { kind: own, policyId, fork: null };

  const pkg = modulePackage(src)?.pkg ?? null;
  const vendorPackage =
    override.vendorPackage ??
    (typeof override.vendorSource === 'string'
      ? (modulePackage(override.vendorSource)?.pkg ?? null)
      : null);
  if (vendorPackage && pkg && vendorPackage !== pkg) {
    return {
      kind: own,
      policyId,
      fork: {
        reason: 'package',
        expected: null,
        vendorPackage,
        package: pkg,
      },
    };
  }

  // undefined = vendor source not loaded; null = the vendor declares no policy_id.
  const vendorId =
    typeof override.vendorSource === 'string'
      ? declaredPolicyId(override.vendorSource)
      : undefined;
  const vp = override.vendorPluginPath;
  const expected =
    vendorId ?? (vp !== null ? continuityPolicyId(vp, path) : null);

  if (!policyId) {
    return {
      kind: 'path',
      policyId,
      fork: {
        reason: expected ? 'no-policy-id' : 'unknown-plugin-path',
        expected,
      },
    };
  }
  if (vp !== null) {
    const bp = override.bundlePluginPath || `/inline/${bundle}/current/bundle`;
    const [vf, vpath] = seedPath(vendorId ?? '', joinPath(vp, path), vp);
    const [of, opath] = seedPath(policyId, joinPath(bp, path), bp);
    if (vf === of && vpath === opath)
      return { kind: 'continues', policyId, fork: null };
    return { kind: 'own', policyId, fork: { reason: 'policy-id', expected } };
  }
  if (typeof vendorId === 'string') {
    return policyId === vendorId
      ? { kind: 'continues', policyId, fork: null }
      : {
          kind: 'own',
          policyId,
          fork: { reason: 'policy-id', expected: vendorId },
        };
  }
  // Neither the vendor plugin path nor a vendor policy_id: cannot tell.
  return { kind: 'own', policyId, fork: null };
}

/** The editor warning for a forked override ("this starts a new evidence stream"). */
export function forkMessage(
  fork: NonNullable<StreamIdentity['fork']>,
  policyId: string | null,
  source: string | null,
): string {
  switch (fork.reason) {
    case 'package':
      return `The override changes the package from ${fork.vendorPackage} to ${fork.package}: this starts a new evidence stream. Keep \`package ${fork.vendorPackage}\` to continue the vendor policy's stream.`;
    case 'policy-id':
      return `policy_id ${JSON.stringify(policyId)} does not continue the vendor policy's evidence stream: this starts a new evidence stream.${fork.expected ? ` Declare \`policy_id := ${JSON.stringify(fork.expected)}\` to continue it.` : ''}`;
    case 'no-policy-id':
      return `The override has no policy_id: this starts a new evidence stream. Declare \`policy_id := ${JSON.stringify(fork.expected)}\` to continue the vendor policy's stream.`;
    case 'unknown-plugin-path':
      return `No instance has reported where plugins load ${source ?? 'the extended source'} from, so a continuing policy_id cannot be built: evidence for this override will start a new stream.`;
  }
}
