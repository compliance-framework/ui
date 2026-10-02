import { describe, expect, it } from 'vitest';
import type { AgentInstanceSummary } from '@/types/agent-config';
import {
  fieldAccess,
  isForbiddenPointer,
  restrictionTooltip,
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

describe('field access (R71)', () => {
  it('forbids api.*, daemon and remote_config.* only', () => {
    expect(isForbiddenPointer('/api/url')).toBe(true);
    expect(isForbiddenPointer('/daemon')).toBe(true);
    expect(isForbiddenPointer('/remote_config/mode')).toBe(true);
    expect(isForbiddenPointer('/verbosity')).toBe(false);
    expect(fieldAccess('/api/auth/client_id', []).state).toBe('forbidden');
  });

  it('restricts config keys per apply_safe instance without a matching flag', () => {
    const list = [
      inst({
        instanceId: 'aaaaaaaa-1',
        hostname: 'host-a',
        remoteConfig: { overridable_config_flags: ['ssh:port'] },
      }),
      inst({
        instanceId: 'bbbbbbbb-2',
        remoteConfig: { overridable_config_flags: [] },
      }),
      inst({ instanceId: 'c', mode: 'apply_all', remoteConfig: {} }),
      inst({ instanceId: 'd', stale: true, remoteConfig: {} }),
    ];
    const port = fieldAccess('/plugins/ssh/config/port', list);
    expect(port.state).toBe('restricted');
    expect(port.restrictions.map((r) => r.instance)).toEqual(['bbbbbbbb']);
    const user = fieldAccess('/plugins/ssh/config/user', list);
    expect(user.restrictions.map((r) => r.instance)).toEqual([
      'host-a',
      'bbbbbbbb',
    ]);
    expect(restrictionTooltip(user.restrictions)).toContain('host-a:');
  });

  it('restricts sources/policies without trusted_sources', () => {
    const list = [
      inst({
        instanceId: 'h1',
        hostname: 'h1',
        remoteConfig: { trusted_sources: [] },
      }),
    ];
    expect(fieldAccess('/plugins/ssh/source', list).restrictions).toHaveLength(
      1,
    );
    expect(
      fieldAccess('/plugins/ssh/policies', list).restrictions,
    ).toHaveLength(1);
    expect(fieldAccess('/plugins/ssh/schedule', list).state).toBe('editable');
    expect(fieldAccess('/verbosity', list).state).toBe('editable');
  });
});
