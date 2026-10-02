import { describe, expect, it } from 'vitest';
import type { AgentInstanceSummary } from '@/types/agent-config';
import {
  accessPopulation,
  accessTooltip,
  fieldAccess,
  instanceFieldVerdict,
  isForbiddenPointer,
} from '../field-access';

function inst(
  over: Partial<AgentInstanceSummary> & { instanceId: string },
): AgentInstanceSummary {
  return {
    hostname: null,
    agentVersion: null,
    mode: 'apply_safe',
    firstSeenAt: '',
    lastSeenAt: '',
    reportedAt: '2026-10-01T00:00:00Z',
    stale: false,
    appliedRevision: 1,
    attemptedRevision: 1,
    status: 'applied',
    reason: null,
    error: null,
    syncStatus: 'in-sync',
    effectiveDigest: null,
    heartbeatConfigRevision: 1,
    reportStale: false,
    unsafe: [],
    ...over,
  };
}

const safe = (id: string, rc: AgentInstanceSummary['remoteConfig'] = {}) =>
  inst({ instanceId: id, hostname: id, remoteConfig: { ...rc } });
const all = (id: string) =>
  inst({ instanceId: id, hostname: id, mode: 'apply_all', remoteConfig: {} });
const report = (id: string) =>
  inst({
    instanceId: id,
    hostname: id,
    mode: 'report',
    remoteConfig: { mode: 'report' },
  });

describe('field access (R71)', () => {
  it('forbids api.*, daemon and remote_config.* only, whatever the instances', () => {
    expect(isForbiddenPointer('/api/url')).toBe(true);
    expect(isForbiddenPointer('/daemon')).toBe(true);
    expect(isForbiddenPointer('/remote_config/mode')).toBe(true);
    expect(isForbiddenPointer('/verbosity')).toBe(false);
    expect(fieldAccess('/api/auth/client_id', []).state).toBe('forbidden');
    expect(fieldAccess('/daemon', [all('a')]).state).toBe('forbidden');
  });

  it('zero reporting instances: editable without restrictions', () => {
    const a = fieldAccess('/plugins/ssh/config/user', []);
    expect(a).toEqual({
      state: 'editable',
      restrictions: [],
      total: 0,
      applying: 0,
    });
    // Stale and never-reported instances are not counted either.
    const ignored = [
      inst({ instanceId: 's', stale: true, mode: 'report' }),
      inst({ instanceId: 'n', mode: '', reportedAt: null, remoteConfig: null }),
    ];
    expect(accessPopulation(ignored)).toEqual([]);
    expect(fieldAccess('/verbosity', ignored).state).toBe('editable');
  });

  it('all / some / none for a config key (overridable_config_flags)', () => {
    const flagged = safe('host-a', { overridable_config_flags: ['ssh:port'] });
    const bare = safe('host-b', { overridable_config_flags: [] });
    const ptr = '/plugins/ssh/config/port';

    const allOf = fieldAccess(ptr, [flagged, all('host-c')]);
    expect(allOf.state).toBe('editable');
    expect(allOf.applying).toBe(2);

    const some = fieldAccess(ptr, [flagged, bare, all('host-c')]);
    expect(some.state).toBe('restricted');
    expect(some.restrictions).toEqual([
      {
        instance: 'host-b',
        reason:
          'apply_safe without an overridable_config_flags entry for ssh:port',
      },
    ]);
    expect(accessTooltip(some)).toBe(
      'May not apply on 1 of 3 reporting instances — apply_safe without an overridable_config_flags entry for ssh:port: host-b',
    );

    const none = fieldAccess('/plugins/ssh/config/user', [flagged, bare]);
    expect(none.state).toBe('readonly');
    expect(accessTooltip(none)).toBe(
      'Read-only: no reporting instance would apply a change here — apply_safe without an overridable_config_flags entry for ssh:user: host-a, host-b',
    );
  });

  it('unscoped and globbed flags follow MatchOverridableConfigFlag', () => {
    const i = safe('h', { overridable_config_flags: ['time*', 'ss?:user'] });
    expect(instanceFieldVerdict('/plugins/any/config/timeout', i).verdict).toBe(
      'yes',
    );
    expect(instanceFieldVerdict('/plugins/ssh/config/user', i).verdict).toBe(
      'yes',
    );
    expect(instanceFieldVerdict('/plugins/sshd/config/user', i).verdict).toBe(
      'no',
    );
    // The whole map: some flag must target the plugin.
    expect(instanceFieldVerdict('/plugins/sshd/config', i).verdict).toBe('yes');
    const scoped = safe('h2', { overridable_config_flags: ['ssh:port'] });
    expect(instanceFieldVerdict('/plugins/other/config', scoped).verdict).toBe(
      'no',
    );
  });

  it('report and off modes never apply: a report-only fleet is read-only', () => {
    const fleet = [report('r1'), report('r2')];
    for (const ptr of [
      '/verbosity',
      '/plugins/ssh/schedule',
      '/plugins/ssh/policy_data/max',
    ]) {
      const a = fieldAccess(ptr, fleet);
      expect(a.state).toBe('readonly');
      expect(accessTooltip(a)).toContain('report-only mode');
      expect(accessTooltip(a)).toContain('r1, r2');
    }
    const off = inst({ instanceId: 'o', mode: 'off', remoteConfig: {} });
    expect(instanceFieldVerdict('/verbosity', off)).toEqual({
      verdict: 'no',
      reason: 'remote configuration is off (mode: off)',
    });
    // One report-only instance next to an applying one: restricted.
    expect(fieldAccess('/verbosity', [report('r'), all('a')]).state).toBe(
      'restricted',
    );
  });

  it('data-only and logging fields apply on every apply mode', () => {
    const fleet = [safe('a'), all('b')];
    for (const ptr of [
      '/verbosity',
      '/agent_evidence/interval',
      '/plugins/ssh',
      '/plugins/ssh/schedule',
      '/plugins/ssh/enabled',
      '/plugins/ssh/labels/team',
      '/plugins/ssh/policy_data',
      '/plugins/ssh/policy_data/nested/deep',
      '/plugins/ssh/policy_behavior',
    ]) {
      expect([ptr, fieldAccess(ptr, fleet).state]).toEqual([ptr, 'editable']);
    }
  });

  it('sources and policies: apply_safe with / without trusted_sources', () => {
    const trusted = safe('t', { trusted_sources: ['ghcr.io/org/*'] });
    const untrusted = safe('u', { trusted_sources: [] });
    expect(fieldAccess('/plugins/ssh/source', [trusted]).state).toBe(
      'editable',
    );
    expect(fieldAccess('/plugins/ssh/source', [untrusted]).state).toBe(
      'readonly',
    );
    expect(
      fieldAccess('/plugins/ssh/source', [untrusted, all('x')]).state,
    ).toBe('restricted');
    // Removing / reordering policy entries is Safe (reduces-scope): never read-only.
    const pol = fieldAccess('/plugins/ssh/policies', [untrusted]);
    expect(pol.state).toBe('restricted');
    expect(pol.restrictions[0]).toMatchObject({ instance: 'u', partial: true });
    expect(accessTooltip(pol)).toContain('only removing or reordering');
    expect(fieldAccess('/plugins/ssh/policies', [trusted]).state).toBe(
      'editable',
    );
  });

  it('labels instances by hostname, else the short id, and caps the host list', () => {
    const many = Array.from({ length: 7 }, (_, n) =>
      inst({
        instanceId: `abcdefgh-${n}`,
        hostname: n === 0 ? null : `h${n}`,
        mode: 'report',
      }),
    );
    const text = accessTooltip(fieldAccess('/verbosity', many));
    expect(text).toContain('abcdefgh, h1, h2, h3, h4 and 2 more');
  });
});
