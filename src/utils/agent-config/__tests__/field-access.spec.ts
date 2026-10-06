import { describe, expect, it } from 'vitest';
import type { AgentInstanceSummary } from '@/types/agent-config';
import {
  accessPopulation,
  accessTooltip,
  addPluginAccess,
  addPluginTooltip,
  classifySource,
  fieldAccess,
  installVerdict,
  instanceFieldVerdict,
  isForbiddenPointer,
  isOciSource,
  sourceKind,
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

  it("apply_safe: re-enabling a plugin the host's file disables needs a trusted source", () => {
    const base = {
      plugins: { ssh: { enabled: false, source: 'ghcr.io/org/ssh:v1' } },
    };
    const u = safe('u', { trusted_sources: [] });
    const t = safe('t', { trusted_sources: ['ghcr.io/org/*'] });
    const ctx = (
      instances: AgentInstanceSummary[],
      overlay: Record<string, unknown> | null = null,
    ) => ({
      instances,
      bases: new Map(instances.map((i) => [i.instanceId, base])),
      overlay,
    });
    const untrusted = fieldAccess('/plugins/ssh/enabled', ctx([u]));
    expect(untrusted.state).toBe('readonly');
    expect(accessTooltip(untrusted)).toContain('re-enabling a plugin');
    expect(fieldAccess('/plugins/ssh/enabled', ctx([t])).state).toBe(
      'editable',
    );
    expect(fieldAccess('/plugins/ssh/enabled', ctx([u, all('a')])).state).toBe(
      'restricted',
    );
    // The overlay's source is the one that runs.
    const moved = { plugins: { ssh: { source: 'docker.io/x/ssh:v1' } } };
    expect(fieldAccess('/plugins/ssh/enabled', ctx([t], moved)).state).toBe(
      'readonly',
    );
    // An enabled plugin, or one without a loaded file, stays data-only.
    const on = new Map([['u', { plugins: { ssh: { source: 'x' } } }]]);
    expect(
      fieldAccess('/plugins/ssh/enabled', { instances: [u], bases: on }).state,
    ).toBe('editable');
    expect(fieldAccess('/plugins/ssh/enabled', [u]).state).toBe('editable');
  });

  it("re-enabling re-checks the plugin's kept policies and ${env:} references", () => {
    // classify_test.go TestClassifyReenableKeptParts.
    const rc = { trusted_sources: ['ghcr.io/trusted/*'] };
    const t = safe('t', rc);
    const at = (plugin: Record<string, unknown>, overlay = null as unknown) =>
      fieldAccess('/plugins/x/enabled', {
        instances: [t],
        bases: new Map([['t', { plugins: { x: plugin } }]]),
        overlay: overlay as Record<string, unknown> | null,
      });
    const x = {
      enabled: false,
      source: 'ghcr.io/trusted/p:v1',
      policies: ['ghcr.io/evil/pol:v9', '/tmp/local-policy'],
      config: { host: 'db', token: '${env:DB_TOKEN}' },
    };
    expect(accessTooltip(at(x))).toContain('re-checks its policies');
    const noPolicies = { ...x, policies: ['ghcr.io/trusted/pol:v1'] };
    expect(accessTooltip(at(noPolicies))).toContain('${env:}');
    // The overlay drops the untrusted entries and the env reference.
    expect(
      at(x, {
        plugins: {
          x: {
            policies: ['ghcr.io/trusted/pol:v1'],
            config: { token: null },
          },
        },
      }).state,
    ).toBe('editable');
  });

  it("apply_safe without trusted_sources: a source the host's file uses can be reused", () => {
    const u = safe('u', { trusted_sources: [] });
    const withOther = {
      plugins: {
        ssh: { source: 'ghcr.io/org/ssh:v1' },
        other: { source: 'ghcr.io/org/other:v2' },
      },
    };
    const reuse = fieldAccess('/plugins/ssh/source', {
      instances: [u],
      bases: new Map([['u', withOther]]),
    });
    expect(reuse.state).toBe('restricted');
    expect(reuse.restrictions[0]).toMatchObject({
      partial: true,
      reason: expect.stringContaining('only a source this host already uses'),
    });
    // A disabled plugin's sources are not "already used" (classify.go usedSources).
    const onlyDisabled = {
      plugins: { ssh: { enabled: false, source: 'ghcr.io/org/ssh:v1' } },
    };
    expect(
      fieldAccess('/plugins/ssh/source', {
        instances: [u],
        bases: new Map([['u', onlyDisabled]]),
      }).state,
    ).toBe('readonly');
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

describe('sources (sources.go KindOf, classify.go sourceClass)', () => {
  it('isOciSource mirrors the API strict tag validation', () => {
    const cases: [string, boolean][] = [
      ['ghcr.io/compliance-framework/plugin-local-ssh:v1.0.0', true],
      ['ghcr.io/compliance-framework/plugin-local-ssh-policies:latest', true],
      ['docker.io/library/alpine:3.20', true],
      ['localhost:5000/plugin:v1', true],
      ['registry.example.com:5000/a/b/c:1.2.3', true],
      ['ghcr.io/x/y', false], // an explicit tag is required
      ['ghcr.io/X/Y:v1', false],
      ['ghcr.io/x/y:', false],
      ['docker.io/alpine:3', false], // implicit library/ namespace
      ['./plugins/foo', false],
      ['/opt/plugin', false],
      ['plugin', false],
      ['', false],
      ['inline:ssh', false],
      // Go's url.Parse rejects or decodes a percent escape in the authority.
      ['foo%.com/acme/plugin:v1', false],
      ['foo%41.com/acme/plugin:v1', false],
    ];
    for (const [s, oci] of cases) {
      expect([s, isOciSource(s)]).toEqual([s, oci]);
      expect(sourceKind(s)).toBe(oci ? 'oci' : 'local');
    }
  });

  it('classifySource: already used, local, trusted, untrusted', () => {
    const used = new Set(['/opt/used', 'docker.io/acme/used:v1']);
    const s = safe('s', {
      trusted_sources: ['ghcr.io/org/*'],
      allow_local_sources: true,
    });
    const a = inst({
      instanceId: 'a',
      mode: 'apply_all',
      remoteConfig: { allow_local_sources: true },
    });
    expect(classifySource(s, '/opt/used', used)).toEqual({
      safety: 'safe',
      reason: 'already-used',
    });
    // allow_local_sources only counts in apply_all.
    expect(classifySource(s, '/opt/new', used).safety).toBe('forbidden');
    expect(classifySource(a, '/opt/new', used)).toEqual({
      safety: 'unsafe',
      reason: 'new-local-source',
    });
    expect(classifySource(all('b'), '/opt/new', used).safety).toBe('forbidden');
    expect(classifySource(s, 'ghcr.io/org/p:v1', used).reason).toBe(
      'trusted-source',
    );
    // '*' does not cross '/'.
    expect(classifySource(s, 'ghcr.io/org/sub/p:v1', used).reason).toBe(
      'untrusted-source',
    );
  });
});

describe('adding a plugin (installVerdict / addPluginAccess)', () => {
  const trusted = safe('trusted', { trusted_sources: ['ghcr.io/org/*'] });
  const bare = safe('bare', { trusted_sources: [], allow_local_sources: true });

  it('without a source: who could install any new plugin', () => {
    expect(installVerdict(report('r'), undefined, null).verdict).toBe('no');
    expect(installVerdict(all('a'), undefined, null).verdict).toBe('yes');
    expect(installVerdict(trusted, undefined, null).verdict).toBe('yes');
    // No trusted_sources: only reusing a source the file already has is Safe.
    expect(installVerdict(bare, undefined, null)).toEqual({
      verdict: 'no',
      reason:
        'apply_safe without trusted_sources: a new source needs apply_all',
    });
    const base = { plugins: { ssh: { source: 'ghcr.io/x/ssh:v1' } } };
    expect(installVerdict(bare, undefined, base).verdict).toBe('partial');

    expect(addPluginAccess([report('r1'), report('r2')]).state).toBe(
      'readonly',
    );
    expect(addPluginAccess([report('r1'), trusted]).state).toBe('restricted');
    expect(addPluginAccess([trusted, all('a')]).state).toBe('editable');
    expect(addPluginAccess([]).state).toBe('editable');
    expect(addPluginTooltip(addPluginAccess([report('r1'), bare]))).toBe(
      'No reporting instance would install a new plugin — report-only mode: does not apply remote configuration: r1; apply_safe without trusted_sources: a new source needs apply_all: bare',
    );
  });

  it('with a source: the concrete classification decides', () => {
    const fleet = [trusted, bare, all('a')];
    const t = addPluginAccess(fleet, 'ghcr.io/org/p:v1');
    expect(t.state).toBe('restricted');
    expect(t.restrictions.map((r) => r.instance)).toEqual(['bare']);
    expect(addPluginAccess([trusted, all('a')], 'ghcr.io/org/p:v1').state).toBe(
      'editable',
    );
    // An untrusted OCI source: only apply_all installs it.
    const u = addPluginAccess(fleet, 'docker.io/acme/p:v1');
    expect(u.state).toBe('restricted');
    expect(u.applying).toBe(1);
    expect(addPluginTooltip(u, 'docker.io/acme/p:v1')).toContain(
      'May not be installed on 2 of 3 reporting instances',
    );
    // A local path: Forbidden everywhere without apply_all + allow_local_sources.
    expect(addPluginAccess(fleet, '/opt/p').state).toBe('readonly');
    // An already-used source is Safe even without trusted_sources.
    const ctx = {
      instances: [bare],
      bases: new Map([
        ['bare', { plugins: { ssh: { source: 'docker.io/acme/p:v1' } } }],
      ]),
    };
    expect(addPluginAccess(ctx, 'docker.io/acme/p:v1').state).toBe('editable');
  });

  it("a plugin a host's file lacks applies there only if its source is installed", () => {
    const base = { plugins: { ssh: { source: 'ghcr.io/org/ssh:v1' } } };
    const instances = [trusted, all('a')];
    const bases = new Map([
      ['trusted', base],
      ['a', base],
    ]);
    const ctx = (source?: string) => ({
      instances,
      bases,
      overlay: { plugins: { extra: source ? { source } : { schedule: '' } } },
    });
    // Untrusted: apply_safe won't install it, so none of its fields apply there.
    const untrusted = ctx('docker.io/acme/extra:v1');
    for (const ptr of ['/plugins/extra', '/plugins/extra/schedule']) {
      const acc = fieldAccess(ptr, untrusted);
      expect(acc.state).toBe('restricted');
      expect(acc.restrictions[0].instance).toBe('trusted');
    }
    // Its own source field follows the field rule (a trusted source would apply).
    expect(fieldAccess('/plugins/extra/source', untrusted).state).toBe(
      'editable',
    );
    expect(
      fieldAccess('/plugins/extra/schedule', ctx('ghcr.io/org/e:v1')).state,
    ).toBe('editable');
    // No source in the overlay for a host that lacks the plugin.
    const noSource = fieldAccess('/plugins/extra/schedule', ctx());
    expect(noSource.state).toBe('readonly');
    expect(accessTooltip(noSource)).toContain('the overlay sets no source');
    // Plugins the file has are unaffected.
    expect(fieldAccess('/plugins/ssh/schedule', untrusted).state).toBe(
      'editable',
    );
  });
});
