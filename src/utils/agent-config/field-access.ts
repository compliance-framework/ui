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
// ADVISORY: the decision is made per field, before a value is known. The preview (and the
// agents) decide on the actual values: a value-dependent rule (a source that the host already
// uses, a new ${env:} reference in a config value) can still change the verdict for a
// particular change.

import { LOCKED_KEYS } from '@/types/agent-config';
import type { AgentInstanceSummary } from '@/types/agent-config';
import { parsePointer } from './json-pointer';
import { configKeyOverridable, pathMatch } from './glob';

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
  return aggregateAccess(
    accessPopulation(contextOf(ctx).instances).map((inst) => ({
      inst,
      v: instanceFieldVerdict(ptr, inst),
    })),
  );
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
