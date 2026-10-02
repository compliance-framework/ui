// Field states on the Effective view (R71):
//   forbidden  — `api.*`, `daemon`, `remote_config.*`: set on the agent host, never overlaid;
//   restricted — editable, but some apply_safe instances will not apply a change there
//                (no matching trusted_sources / overridable_config_flags), derived from each
//                instance's reported `remote_config`;
//   editable   — everything else.
// Mirrors agentconfig.Classify for apply_safe hosts. ADVISORY: the preview and the agents
// decide; a value-dependent rule (e.g. a source that is already used) can still make a
// particular change safe.

import { LOCKED_KEYS } from '@/types/agent-config';
import type { AgentInstanceSummary } from '@/types/agent-config';
import { parsePointer } from './json-pointer';
import { configKeyOverridable, pathMatch } from './glob';

export type FieldState = 'editable' | 'restricted' | 'forbidden';

export interface FieldRestriction {
  /** Hostname, or the short instance id. */
  instance: string;
  reason: string;
}

export interface FieldAccess {
  state: FieldState;
  restrictions: FieldRestriction[];
}

export const FORBIDDEN_TOOLTIP =
  'Set on the agent host; can never be changed remotely';

/** `api`, `daemon`, `remote_config` and anything below them (R23, R30). */
export function isForbiddenPointer(ptr: string): boolean {
  const first = parsePointer(ptr)[0];
  return (LOCKED_KEYS as readonly string[]).includes(first ?? '');
}

function label(i: AgentInstanceSummary): string {
  return i.hostname || i.instanceId.slice(0, 8);
}

const NO_TRUSTED =
  'apply_safe without trusted_sources: a new source needs apply_all';

/** Why each fresh apply_safe instance would not apply a change at `ptr`. */
export function fieldRestrictions(
  ptr: string,
  instances: AgentInstanceSummary[],
): FieldRestriction[] {
  const t = parsePointer(ptr);
  const out: FieldRestriction[] = [];
  for (const inst of instances) {
    const rc = inst.remoteConfig;
    if (inst.stale || inst.mode !== 'apply_safe' || !rc) continue;
    const trusted = rc.trusted_sources ?? [];
    const flags = rc.overridable_config_flags ?? [];
    const reasons: string[] = [];
    if (t[0] === 'plugins' && t.length >= 3) {
      const plugin = t[1];
      if (t[2] === 'config' && t.length === 4) {
        if (!configKeyOverridable(flags, plugin, t[3])) {
          reasons.push(
            `apply_safe without an overridable_config_flags entry for ${plugin}:${t[3]}`,
          );
        }
      } else if (t[2] === 'config' && t.length === 3) {
        const any = flags.some((f) => {
          const idx = f.indexOf(':');
          return idx < 0 || pathMatch(f.slice(0, idx), plugin);
        });
        if (!any) {
          reasons.push(
            `apply_safe without overridable_config_flags for ${plugin}: config changes need apply_all`,
          );
        }
      } else if (t[2] === 'source' || t[2] === 'policies') {
        if (!trusted.length) reasons.push(NO_TRUSTED);
      }
    }
    for (const reason of reasons) out.push({ instance: label(inst), reason });
  }
  return out;
}

export function fieldAccess(
  ptr: string,
  instances: AgentInstanceSummary[],
): FieldAccess {
  if (isForbiddenPointer(ptr)) return { state: 'forbidden', restrictions: [] };
  const restrictions = fieldRestrictions(ptr, instances);
  return {
    state: restrictions.length ? 'restricted' : 'editable',
    restrictions,
  };
}

/** One tooltip line per instance: "host-a: reason; host-b: reason". */
export function restrictionTooltip(restrictions: FieldRestriction[]): string {
  if (!restrictions.length) return '';
  return `Some instances will not apply a change here — ${restrictions
    .map((r) => `${r.instance}: ${r.reason}`)
    .join('; ')}`;
}
