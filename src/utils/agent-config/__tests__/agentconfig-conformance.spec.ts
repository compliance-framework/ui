// The UI's copies of the API's pkg/agentconfig rules against the API's golden file of expected
// results (fixtures/agentconfig-conformance.json, vendored byte for byte; see fixtures/README.md),
// so a rule that changes on one side and not the other fails here. Every table is run; the
// expectations all come from the file.
import { describe, expect, it } from 'vitest';
import type {
  AgentInstanceSummary,
  ConfigDoc,
  OverlayDoc,
} from '@/types/agent-config';
import fixture from './fixtures/agentconfig-conformance.json';
import { configKeyOverridable, sourceTrusted } from '../glob';
import { validateCron5 } from '../cron5';
import { fieldAccess, sourceKind } from '../field-access';

interface Conformance {
  trustedSources: {
    patterns: string[];
    cases: [string, boolean][];
    extra: { patterns: string[]; source: string; want: boolean }[];
  };
  overridableConfigFlags: {
    name: string;
    flags: string[];
    plugin: string;
    key: string;
    want: boolean;
  }[];
  sourceKinds: [string, 'oci' | 'local'][];
  schedules: { valid: string[]; invalid: string[] };
  applySafe: {
    cases: {
      name: string;
      trusted: string[];
      file: NonNullable<ConfigDoc['plugins']>;
      overlay: OverlayDoc | null;
      path: string;
      state: string;
    }[];
  };
}

const cases = fixture as unknown as Conformance;

function applySafe(trusted: string[]): AgentInstanceSummary {
  return {
    instanceId: 'h',
    hostname: 'h',
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
    remoteConfig: { mode: 'apply_safe', trusted_sources: trusted },
  };
}

describe('pkg/agentconfig conformance', () => {
  it('knows every table of the golden file', () => {
    // A table the API adds must get a runner here (pluginNames runs with validation.ts).
    expect(
      Object.keys(fixture)
        .filter((k) => !k.startsWith('_'))
        .sort(),
    ).toEqual([
      'applySafe',
      'overridableConfigFlags',
      'pluginNames',
      'schedules',
      'sourceKinds',
      'trustedSources',
    ]);
  });

  it.each(cases.trustedSources.cases)(
    'MatchTrustedSource(%j)',
    (source, want) => {
      expect(sourceTrusted(cases.trustedSources.patterns, source)).toBe(want);
    },
  );

  it.each(cases.trustedSources.extra)(
    'MatchTrustedSource($patterns, $source)',
    ({ patterns, source, want }) => {
      expect(sourceTrusted(patterns, source)).toBe(want);
    },
  );

  it.each(cases.overridableConfigFlags)(
    'MatchOverridableConfigFlag: $name',
    ({ flags, plugin, key, want }) => {
      expect(configKeyOverridable(flags, plugin, key)).toBe(want);
    },
  );

  it.each(cases.sourceKinds)('KindOf(%j) = %s', (source, kind) => {
    expect(sourceKind(source)).toBe(kind);
  });

  it.each(cases.schedules.valid)('ParseSchedule(%j) succeeds', (expr) => {
    expect(validateCron5(expr)).toBeNull();
  });

  it.each(cases.schedules.invalid)('ParseSchedule(%j) fails', (expr) => {
    expect(validateCron5(expr)).not.toBeNull();
  });

  it.each(cases.applySafe.cases)(
    'apply_safe: $name',
    ({ trusted, file, overlay, path, state }) => {
      const inst = applySafe(trusted);
      const base: ConfigDoc = { plugins: file };
      expect(
        fieldAccess(path, {
          instances: [inst],
          bases: new Map([[inst.instanceId, base]]),
          overlay,
        }).state,
      ).toBe(state);
    },
  );
});
