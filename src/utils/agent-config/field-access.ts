// Field states on the Effective view (R71), derived per instance from the API's
// pkg/agentconfig rules (classify.go Classify + WillApply, remoteconfig.go):
//   forbidden  — `api.*`, `daemon`, `remote_config.*`: set on the agent host, never overlaid
//                (Classify: locked-key → Forbidden, rejected in every mode);
//   readonly   — no reporting instance would apply a change there (e.g. every instance is in
//                report mode, or none has a matching overridable_config_flags entry);
//   restricted — editable, but some reporting instances would not apply (all of) it;
//   editable   — every reporting instance would apply a change there.
//
// "Reporting instances" (the population) are the instances whose report is fresh: not stale
// and reported at least once (they have a mode and a remote_config). Stale and never-reported
// instances are left out, as the shields always did: their remote_config is unknown or
// outdated, and the API's preview flags them as stale too.
//
// A plugin a host's file does not have (e.g. one the draft adds) is installed by that host
// only if it accepts the plugin's source (installVerdict); its fields apply there only then.
// Adding a plugin (addPluginAccess) follows the same rule.
//
// ADVISORY: the decision is made per field, before a value is known. The preview (and the
// agents) decide on the actual values: a value-dependent rule (a source that the host already
// uses, a new ${env:} reference in a config value) can still change the verdict for a
// particular change.

import { LOCKED_KEYS } from '@/types/agent-config';
import type {
  AgentInstanceSummary,
  ChangeSafety,
  ConfigDoc,
  OverlayDoc,
} from '@/types/agent-config';
import { getAt, parsePointer, pointer } from './json-pointer';
import { isPlainObject } from './merge-patch';
import { configKeyOverridable, pathMatch, sourceTrusted } from './glob';

export type FieldState = 'editable' | 'restricted' | 'readonly' | 'forbidden';

/**
 * Whether one instance applies a change at a pointer: every change ('yes'), only some
 * changes ('partial', e.g. removing a policy entry but not adding one), or none ('no').
 */
export type ApplyVerdict = 'yes' | 'partial' | 'no';

export interface InstanceVerdict {
  verdict: ApplyVerdict;
  /** Why not ('' for 'yes'). */
  reason: string;
}

export interface FieldRestriction {
  /** Hostname, or the short instance id. */
  instance: string;
  reason: string;
  /** Some changes here still apply on this instance. */
  partial?: boolean;
}

export interface FieldAccess {
  state: FieldState;
  /** One entry per reporting instance that would not apply every change here. */
  restrictions: FieldRestriction[];
  /** Reporting instances considered. */
  total: number;
  /** Reporting instances that would apply every change here. */
  applying: number;
}

/** What the access rules read. */
export interface AccessContext {
  instances: readonly AgentInstanceSummary[];
  /** Loaded instance bases (the host's file) by instance id: which plugins / sources it has. */
  bases?: ReadonlyMap<string, ConfigDoc | null>;
  /** The draft overlay: the source of a plugin a host's file does not have. */
  overlay?: OverlayDoc | null;
}

export const FORBIDDEN_TOOLTIP =
  'Set on the agent host; can never be changed remotely';

/** `api`, `daemon`, `remote_config` and anything below them (R23, R30). */
export function isForbiddenPointer(ptr: string): boolean {
  const first = parsePointer(ptr)[0];
  return (LOCKED_KEYS as readonly string[]).includes(first ?? '');
}

export function instanceLabel(i: AgentInstanceSummary): string {
  return i.hostname || i.instanceId.slice(0, 8);
}

/** The instances the access rules count: fresh and reported (see the header). */
export function accessPopulation(
  instances: readonly AgentInstanceSummary[],
): AgentInstanceSummary[] {
  return instances.filter(
    (i) => !i.stale && i.reportedAt != null && i.mode !== '',
  );
}

/** The instance's remote_config with the API's Normalize defaults (R29). */
export function normalizedRemoteConfig(inst: AgentInstanceSummary) {
  const rc = inst.remoteConfig ?? {};
  return {
    mode: inst.mode || rc.mode || '',
    trusted: rc.trusted_sources ?? [],
    flags: rc.overridable_config_flags ?? [],
    allowLocal: rc.allow_local_sources ?? false,
  };
}

export const REASON_MODE_OFF = 'remote configuration is off (mode: off)';
export const REASON_MODE_REPORT =
  'report-only mode: does not apply remote configuration';
const NO_TRUSTED =
  'apply_safe without trusted_sources: a new source needs apply_all';
const NO_TRUSTED_POLICIES =
  'apply_safe without trusted_sources: only removing or reordering entries applies; a new entry needs apply_all';

const YES: InstanceVerdict = { verdict: 'yes', reason: '' };
const no = (reason: string): InstanceVerdict => ({ verdict: 'no', reason });

/**
 * WillApply's mode gate: off and report never apply; only apply_safe and apply_all do (an
 * unknown mode is treated like off, as the API does). null = the mode may apply.
 */
export function modeVerdict(mode: string): InstanceVerdict | null {
  if (mode === 'apply_safe' || mode === 'apply_all') return null;
  return no(mode === 'report' ? REASON_MODE_REPORT : REASON_MODE_OFF);
}

/**
 * Whether `inst` would apply a change at `ptr` (Classify + WillApply, per field):
 *   - off / report: never (WillApply mode-off / mode-report);
 *   - apply_all: every change but a forbidden one (Unsafe is applied);
 *   - apply_safe, by field (Unsafe is rejected):
 *     - `verbosity`, `agent_evidence.*`: logging → Safe;
 *     - plugin `schedule`, `enabled`, `protocol_version`, `labels`, `policy_data`,
 *       `policy_behavior` (any depth) and removing a plugin: data-only / reduces-scope → Safe;
 *     - plugin `config.<k>`: Safe iff MatchOverridableConfigFlag(plugin, k); the whole
 *       `config` map needs at least one flag whose plugin glob matches;
 *     - plugin `source`: a new source is Safe only when trusted (or already used), so it
 *       needs trusted_sources;
 *     - plugin `policies`: removing / reordering entries is Safe (reduces-scope), a new entry
 *       follows the source rule, so without trusted_sources it is 'partial'.
 */
export function instanceFieldVerdict(
  ptr: string,
  inst: AgentInstanceSummary,
): InstanceVerdict {
  const rc = normalizedRemoteConfig(inst);
  const gate = modeVerdict(rc.mode);
  if (gate) return gate;
  const t = parsePointer(ptr);
  if (t[0] !== 'plugins' || t.length < 3 || rc.mode === 'apply_all') {
    return YES;
  }
  const plugin = t[1];
  switch (t[2]) {
    case 'config': {
      if (t.length === 3) {
        const any = rc.flags.some((f) => {
          const idx = f.indexOf(':');
          return idx < 0 || pathMatch(f.slice(0, idx), plugin);
        });
        return any
          ? YES
          : no(
              `apply_safe without overridable_config_flags for ${plugin}: config changes need apply_all`,
            );
      }
      return configKeyOverridable(rc.flags, plugin, t[3])
        ? YES
        : no(
            `apply_safe without an overridable_config_flags entry for ${plugin}:${t[3]}`,
          );
    }
    case 'source':
      return rc.trusted.length ? YES : no(NO_TRUSTED);
    case 'policies':
      return rc.trusted.length
        ? YES
        : { verdict: 'partial', reason: NO_TRUSTED_POLICIES };
    default:
      return YES;
  }
}

// ---- Sources (sources.go KindOf, classify.go sourceClass) ----

const TAG_CHARS = /^[A-Za-z0-9_.-]{1,128}$/;
const REPO_CHARS = /^[a-z0-9_./-]{2,255}$/;
// RFC 3986 authority as Go's url.Parse("//"+name) accepts it back unchanged: host characters
// and an optional all-digit port.
const REGISTRY_RE =
  /^[A-Za-z0-9._~!$&'()*+,;=%-]+(:[0-9]*)?$|^\[[0-9A-Fa-f:.]+\](:[0-9]*)?$/;

/**
 * agentconfig.IsOCISource: go-containerregistry name.NewTag(s, StrictValidation): an explicit
 * registry (the first path segment has a '.' or ':'), a lowercase repository and an explicit
 * tag. Everything else is a local path (KindOf).
 */
export function isOciSource(s: string): boolean {
  const parts = s.split(':');
  let base = s;
  let tag = '';
  if (parts.length > 1 && !parts[parts.length - 1].includes('/')) {
    tag = parts[parts.length - 1];
    base = parts.slice(0, -1).join(':');
  }
  if (!TAG_CHARS.test(tag)) return false;
  const slash = base.indexOf('/');
  if (slash < 0) return false;
  const registry = base.slice(0, slash);
  const repo = base.slice(slash + 1);
  if (!registry.includes('.') && !registry.includes(':')) return false;
  // Docker Hub's implicit "library/" namespace is rejected by strict validation.
  if (
    (registry === 'docker.io' || registry === 'index.docker.io') &&
    !repo.includes('/')
  ) {
    return false;
  }
  return REPO_CHARS.test(repo) && REGISTRY_RE.test(registry);
}

export type SourceKind = 'oci' | 'local';

export function sourceKind(s: string): SourceKind {
  return isOciSource(s) ? 'oci' : 'local';
}

/**
 * classify.go usedSources: every plugin source and policy entry of the host's file (disabled
 * plugins included). Without a loaded base, the plugin sources the instance reported (R76).
 */
export function usedSources(
  inst: AgentInstanceSummary,
  base: ConfigDoc | null | undefined,
): Set<string> {
  const used = new Set<string>();
  if (base) {
    for (const p of Object.values(base.plugins ?? {})) {
      if (!isPlainObject(p)) continue;
      if (typeof p.source === 'string' && p.source) used.add(p.source);
      for (const e of Array.isArray(p.policies) ? p.policies : []) used.add(e);
    }
    return used;
  }
  for (const r of inst.plugins ?? []) if (r.source) used.add(r.source);
  return used;
}

export interface SourceClass {
  safety: ChangeSafety;
  /** classify.go change reason code (constants.ts CHANGE_REASON_LABELS). */
  reason: string;
}

/** classify.go sourceClass: the class of a NEW source / policy entry on one instance. */
export function classifySource(
  inst: AgentInstanceSummary,
  source: string,
  used: ReadonlySet<string>,
): SourceClass {
  const rc = normalizedRemoteConfig(inst);
  if (used.has(source)) return { safety: 'safe', reason: 'already-used' };
  if (sourceKind(source) === 'local') {
    return rc.mode === 'apply_all' && rc.allowLocal
      ? { safety: 'unsafe', reason: 'new-local-source' }
      : { safety: 'forbidden', reason: 'local-source-not-allowed' };
  }
  if (sourceTrusted(rc.trusted, source)) {
    return { safety: 'safe', reason: 'trusted-source' };
  }
  return { safety: 'unsafe', reason: 'untrusted-source' };
}

const SOURCE_REASON_TEXT: Record<string, string> = {
  'local-source-not-allowed':
    'a local source needs apply_all with allow_local_sources',
  'untrusted-source':
    'apply_safe: the source matches no trusted_sources entry (needs apply_all)',
};

/**
 * Whether `inst` would install a NEW plugin (one its file does not have) with `source`
 * (Classify of `plugins.<name>` + WillApply). A new plugin is the class of its parts and only
 * its source can be unsafe, so:
 *   - off / report: never;
 *   - with a source: sourceClass → Safe (already used, or trusted) applies in apply_safe and
 *     apply_all; Unsafe (untrusted OCI; a local source with apply_all + allow_local_sources)
 *     only in apply_all; Forbidden (a local source otherwise) never;
 *   - without a source yet ("could it install any new plugin?"): apply_all yes (any OCI
 *     source); apply_safe yes with a trusted_sources entry, 'partial' without one when its
 *     file already uses some source (reusing it is Safe), else no. allow_local_sources plays
 *     no part in apply_safe: a new local source is Forbidden there.
 */
export function installVerdict(
  inst: AgentInstanceSummary,
  source: string | undefined,
  base: ConfigDoc | null | undefined,
): InstanceVerdict {
  const rc = normalizedRemoteConfig(inst);
  const gate = modeVerdict(rc.mode);
  if (gate) return gate;
  const used = usedSources(inst, base);
  if (source) {
    const c = classifySource(inst, source, used);
    if (c.safety === 'forbidden') return no(SOURCE_REASON_TEXT[c.reason]);
    if (c.safety === 'unsafe' && rc.mode === 'apply_safe') {
      return no(SOURCE_REASON_TEXT['untrusted-source']);
    }
    return YES;
  }
  if (rc.mode === 'apply_all' || rc.trusted.length) return YES;
  if (used.size) {
    return {
      verdict: 'partial',
      reason:
        'apply_safe without trusted_sources: only a source this host already uses',
    };
  }
  return no(NO_TRUSTED);
}

const RANK: Record<ApplyVerdict, number> = { no: 0, partial: 1, yes: 2 };

function worst(a: InstanceVerdict, b: InstanceVerdict): InstanceVerdict {
  return RANK[b.verdict] < RANK[a.verdict] ? b : a;
}

/**
 * Whether the host's file has `plugin`: from its loaded base, else from its reported plugins
 * (R76), else unknown (assumed present).
 */
function hostHasPlugin(
  inst: AgentInstanceSummary,
  plugin: string,
  base: ConfigDoc | null | undefined,
): boolean {
  if (base) return isPlainObject(base.plugins?.[plugin]);
  if (inst.plugins?.length) return inst.plugins.some((r) => r.name === plugin);
  return true;
}

/** instanceFieldVerdict, plus the install rule for a plugin the host's file lacks. */
function verdictAt(
  ptr: string,
  inst: AgentInstanceSummary,
  ctx: AccessContext,
): InstanceVerdict {
  const field = instanceFieldVerdict(ptr, inst);
  const t = parsePointer(ptr);
  if (field.verdict === 'no' || t[0] !== 'plugins' || t.length < 2) {
    return field;
  }
  const base = ctx.bases?.get(inst.instanceId);
  if (hostHasPlugin(inst, t[1], base)) return field;
  // Its own source is judged by the field rule ("could another source apply?").
  if (t[2] === 'source') return field;
  const src = getAt(ctx.overlay ?? {}, pointer('plugins', t[1], 'source'));
  if (typeof src !== 'string' || !src) {
    return no("not in this host's file, and the overlay sets no source");
  }
  return worst(field, installVerdict(inst, src, base));
}

function contextOf(
  ctx: AccessContext | readonly AgentInstanceSummary[],
): AccessContext {
  return Array.isArray(ctx)
    ? { instances: ctx as readonly AgentInstanceSummary[] }
    : (ctx as AccessContext);
}

/** Aggregates per-instance verdicts into the three-state access. */
export function aggregateAccess(
  verdicts: { inst: AgentInstanceSummary; v: InstanceVerdict }[],
): FieldAccess {
  const total = verdicts.length;
  // No reporting instance yet: there is nothing to check against. The field stays editable
  // without a shield (rather than read-only, which would block configuring an agent before
  // its first report): the overlay is stored, and each instance applies it according to its
  // own remote_config when it reports.
  if (!total) {
    return { state: 'editable', restrictions: [], total: 0, applying: 0 };
  }
  const restrictions: FieldRestriction[] = [];
  let applying = 0;
  let some = 0;
  for (const { inst, v } of verdicts) {
    if (v.verdict === 'yes') {
      applying++;
      continue;
    }
    if (v.verdict === 'partial') some++;
    restrictions.push({
      instance: instanceLabel(inst),
      reason: v.reason,
      ...(v.verdict === 'partial' ? { partial: true } : {}),
    });
  }
  let state: FieldState = 'restricted';
  if (applying === total) state = 'editable';
  else if (applying + some === 0) state = 'readonly';
  return { state, restrictions, total, applying };
}

/** The three-state access of the field at `ptr` over the reporting instances. */
export function fieldAccess(
  ptr: string,
  ctx: AccessContext | readonly AgentInstanceSummary[],
): FieldAccess {
  if (isForbiddenPointer(ptr)) {
    return { state: 'forbidden', restrictions: [], total: 0, applying: 0 };
  }
  const c = contextOf(ctx);
  return aggregateAccess(
    accessPopulation(c.instances).map((inst) => ({
      inst,
      v: verdictAt(ptr, inst, c),
    })),
  );
}

/**
 * Whether the reporting instances would install a new plugin: with `source` once it is known,
 * else whether they could install one at all (installVerdict).
 */
export function addPluginAccess(
  ctx: AccessContext | readonly AgentInstanceSummary[],
  source?: string,
): FieldAccess {
  const c = contextOf(ctx);
  const src = source?.trim() || undefined;
  return aggregateAccess(
    accessPopulation(c.instances).map((inst) => ({
      inst,
      v: installVerdict(inst, src, c.bases?.get(inst.instanceId)),
    })),
  );
}

/** Tooltip / aria text of the add-plugin action ('' when every instance would install it). */
export function addPluginTooltip(access: FieldAccess, source?: string): string {
  if (!access.restrictions.length) return '';
  const what = source ? 'this plugin' : 'a new plugin';
  const why = groupRestrictions(access.restrictions);
  if (access.state === 'readonly') {
    return `No reporting instance would install ${what} — ${why}`;
  }
  return `May not be installed on ${access.restrictions.length} of ${
    access.total
  } reporting instance${access.total === 1 ? '' : 's'} — ${why}`;
}

const MAX_HOSTS = 5;

/** "reason (host-a, host-b); reason2 (host-c)": restrictions grouped by reason. */
export function groupRestrictions(restrictions: FieldRestriction[]): string {
  const groups = new Map<string, string[]>();
  for (const r of restrictions) {
    const list = groups.get(r.reason) ?? [];
    list.push(r.instance);
    groups.set(r.reason, list);
  }
  return Array.from(groups, ([reason, hosts]) => {
    const shown = hosts.slice(0, MAX_HOSTS).join(', ');
    const more =
      hosts.length > MAX_HOSTS ? ` and ${hosts.length - MAX_HOSTS} more` : '';
    return `${reason}: ${shown}${more}`;
  }).join('; ');
}

/** Tooltip / aria text of a restricted or read-only field ('' otherwise). */
export function accessTooltip(access: FieldAccess): string {
  if (!access.restrictions.length) return '';
  const why = groupRestrictions(access.restrictions);
  if (access.state === 'readonly') {
    return `Read-only: no reporting instance would apply a change here — ${why}`;
  }
  const n = access.restrictions.length;
  return `May not apply on ${n} of ${access.total} reporting instance${
    access.total === 1 ? '' : 's'
  } — ${why}`;
}
