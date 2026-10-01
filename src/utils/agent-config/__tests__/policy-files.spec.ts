import { describe, expect, it } from 'vitest';
import type {
  ConfigDoc,
  PolicyBundleReport,
  PolicyFileReport,
} from '@/types/agent-config';
import {
  bundleFileStates,
  changedLeafPaths,
  firstNonPolicyPath,
  isPolicyOnlyChange,
  POLICY_ONLY_GENERIC_REASON,
  policyOnlyGate,
  sourceArtifact,
  vendorArtifactFor,
  vendorFilesFor,
  vendorTestsFor,
} from '../policy-files';

const f = (path: string, pkg?: string): PolicyFileReport => ({
  path,
  sha256: 'x',
  package: pkg,
});
const vendor = [f('a.rego'), f('b.rego'), f('c_test.rego')];

describe('bundleFileStates (U4.3 table)', () => {
  const row = (rows: ReturnType<typeof bundleFileStates>, path: string) =>
    rows.find((r) => r.path === path)!;

  it('covers the known-vendor rows', () => {
    const rows = bundleFileStates(vendor, null, {
      extends: 'oci',
      modules: {
        'b.rego': 'package b',
        'new.rego': 'package n',
        'both.rego': 'x',
      },
      delete: ['c_test.rego', 'missing.rego', 'both.rego'],
    });
    expect(row(rows, 'a.rego')).toMatchObject({
      state: 'inherited',
      actions: ['override', 'delete'],
    });
    expect(row(rows, 'b.rego')).toMatchObject({
      state: 'overridden',
      inOverlay: true,
      actions: ['edit', 'restore', 'delete'],
    });
    expect(row(rows, 'c_test.rego')).toMatchObject({
      state: 'deleted',
      isTest: true,
      actions: ['undelete'],
    });
    expect(row(rows, 'new.rego')).toMatchObject({
      state: 'added',
      actions: ['edit', 'restore'],
    });
    expect(row(rows, 'missing.rego')).toMatchObject({
      state: 'delete-missing',
      actions: ['undelete'],
    });
    expect(row(rows, 'both.rego')).toMatchObject({
      state: 'conflict',
      actions: ['restore', 'undelete'],
    });
  });

  it('covers the unknown-vendor rows', () => {
    const rows = bundleFileStates(null, null, {
      extends: 'oci',
      modules: { 'x.rego': 'package x' },
      delete: ['y.rego'],
    });
    expect(row(rows, 'x.rego').state).toBe('set');
    expect(row(rows, 'y.rego').state).toBe('deleted');
  });

  it('offers "revert to vendor" / "drop file module" for file-defined modules and restore for nulls', () => {
    const file = {
      extends: 'oci',
      modules: { 'a.rego': 'file a', 'own.rego': 'file own' },
    };
    const rows = bundleFileStates(vendor, file, {});
    expect(row(rows, 'a.rego').actions).toEqual([
      'edit',
      'revert-to-vendor',
      'delete',
    ]);
    expect(row(rows, 'own.rego').actions).toEqual(['edit', 'drop-file-module']);
    const nulled = bundleFileStates(vendor, file, {
      modules: { 'a.rego': null, 'own.rego': null },
    });
    expect(row(nulled, 'a.rego')).toMatchObject({ state: 'inherited' });
    expect(row(nulled, 'a.rego').actions).toContain('restore');
    expect(row(nulled, 'own.rego')).toMatchObject({
      state: 'dropped',
      actions: ['restore'],
    });
  });
});

describe('vendorFilesFor', () => {
  const reports: PolicyBundleReport[] = [
    {
      source: 'inline:tuned',
      digest: 'd',
      extends: { source: 'oci', digest: 'e', files: [f('v.rego')] },
      files: [],
    },
    { source: 'oci2', digest: 'd2', files: [f('w.rego')] },
  ];
  it('uses extends.files, then a direct report of the extends source, else null', () => {
    expect(
      vendorFilesFor('tuned', { extends: 'oci' }, reports)?.map((x) => x.path),
    ).toEqual(['v.rego']);
    expect(
      vendorFilesFor('other', { extends: 'oci2' }, reports)?.map((x) => x.path),
    ).toEqual(['w.rego']);
    expect(vendorFilesFor('other', { extends: 'oci3' }, reports)).toBeNull();
    expect(vendorFilesFor('tuned', { extends: 'oci' }, null)).toBeNull();
  });
});

describe('isPolicyOnlyChange (API PolicyOnlyChange + R22 + R58)', () => {
  const base: ConfigDoc = {
    plugins: {
      ssh: { source: 'ghcr.io/x/ssh:v1', policies: ['S', 'T'] },
      os: { source: 'ghcr.io/x/os:v1', policies: ['U'] },
    },
  };
  const bundle = (ext?: string) => ({
    ...(ext ? { extends: ext } : {}),
    modules: { 'a.rego': 'package a' },
  });

  it('allows module edits and inline add/remove', () => {
    expect(
      isPolicyOnlyChange([base], {}, { policy_bundles: { b: bundle() } }),
    ).toBe(true);
    expect(
      isPolicyOnlyChange(
        [base],
        { policy_bundles: { b: bundle() } },
        {
          policy_bundles: { b: bundle() },
          plugins: { ssh: { policies: ['S', 'T', 'inline:b'] } },
        },
      ),
    ).toBe(true);
  });

  it('allows the R22 swap in both directions', () => {
    const swapped = {
      policy_bundles: { b: bundle('S') },
      plugins: { ssh: { policies: ['inline:b', 'T'] } },
    };
    expect(isPolicyOnlyChange([base], {}, swapped)).toBe(true);
    expect(
      isPolicyOnlyChange([base], swapped, {
        policy_bundles: { b: bundle('S') },
      }),
    ).toBe(true);
  });

  it('refuses a swap with a mismatched extends', () => {
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        {
          policy_bundles: { b: bundle('T') },
          plugins: { ssh: { policies: ['inline:b', 'T'] } },
        },
      ),
    ).toBe(false);
  });

  it('refuses replacing a file list with [inline:x]', () => {
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        {
          policy_bundles: { x: bundle() },
          plugins: { ssh: { policies: ['inline:x'] } },
        },
      ),
    ).toBe(false);
  });

  it('R58: a new extends must be an already-used source or the swapped one', () => {
    expect(
      isPolicyOnlyChange([base], {}, { policy_bundles: { b: bundle('U') } }),
    ).toBe(true);
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        { policy_bundles: { b: bundle('ghcr.io/x/ssh:v1') } },
      ),
    ).toBe(true);
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        { policy_bundles: { b: bundle('docker.io/new:v1') } },
      ),
    ).toBe(false);
    // Changing an existing extends to a new source is also refused.
    expect(
      isPolicyOnlyChange(
        [base],
        { policy_bundles: { b: bundle('U') } },
        { policy_bundles: { b: bundle('docker.io/new:v1') } },
      ),
    ).toBe(false);
    // With no known bases nothing is "used".
    expect(
      isPolicyOnlyChange([], {}, { policy_bundles: { b: bundle('U') } }),
    ).toBe(false);
  });

  it('refuses non-policy paths, removed plugins and empty plugin objects', () => {
    expect(isPolicyOnlyChange([base], {}, { verbosity: 1 })).toBe(false);
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        { plugins: { ssh: { schedule: '@hourly' } } },
      ),
    ).toBe(false);
    expect(isPolicyOnlyChange([base], {}, { plugins: { ssh: null } })).toBe(
      false,
    );
    expect(isPolicyOnlyChange([base], {}, { plugins: { neu: {} } })).toBe(
      false,
    );
    expect(
      firstNonPolicyPath({}, { verbosity: 1, policy_bundles: { b: bundle() } }),
    ).toBe('/verbosity');
    expect(
      firstNonPolicyPath({}, { policy_bundles: { b: bundle() } }),
    ).toBeNull();
  });

  it('refuses a policies list on a plugin that does not exist in the base', () => {
    expect(
      isPolicyOnlyChange(
        [base],
        {},
        {
          plugins: { ghost: { policies: ['inline:b'] } },
          policy_bundles: { b: bundle() },
        },
      ),
    ).toBe(false);
  });
});

describe('policyOnlyGate (R61: Revert / Clear overlay)', () => {
  const base: ConfigDoc = {
    plugins: { ssh: { source: 'ghcr.io/x/ssh:v1', policies: ['S'] } },
  };
  const bundle = (ext?: string) => ({
    ...(ext ? { extends: ext } : {}),
    modules: { 'a.rego': 'package a' },
  });

  it('allows a policy-only change', () => {
    expect(
      policyOnlyGate([base], { policy_bundles: { b: bundle() } }, {}),
    ).toEqual({ allowed: true, reason: '' });
  });

  it('names the first non-policy path', () => {
    expect(
      policyOnlyGate([base], { plugins: { ssh: { schedule: '@hourly' } } }, {}),
    ).toEqual({
      allowed: false,
      reason: 'Needs agent:configure: this changes /plugins/ssh/schedule',
    });
  });

  it('falls back to a generic reason for R22/R58 refusals', () => {
    expect(
      policyOnlyGate([base], {}, { policy_bundles: { b: bundle('new:v1') } }),
    ).toEqual({ allowed: false, reason: POLICY_ONLY_GENERIC_REASON });
  });
});

describe('vendor sources (R62/R64)', () => {
  const report = (
    over: Partial<PolicyBundleReport> & { source: string },
  ): PolicyBundleReport => ({ digest: 'tree:x', files: [], ...over });

  it('prefers the inline entry extends digest when it reports the same source', () => {
    const reports = [
      report({
        source: 'inline:b',
        extends: {
          source: 'oci://v1',
          digest: 'tree:v',
          files: [],
          artifactDigest: 'sha256:ext',
        },
      }),
      report({ source: 'oci://v1', artifactDigest: 'sha256:direct' }),
    ];
    expect(vendorArtifactFor('b', { extends: 'oci://v1' }, [reports])).toEqual({
      digest: 'sha256:ext',
      miss: null,
    });
  });

  it('falls back to the direct source report, then explains the miss', () => {
    const mismatch = [
      report({
        source: 'inline:b',
        extends: {
          source: 'oci://v0',
          digest: 'tree:v',
          files: [],
          artifactDigest: 'sha256:old',
        },
      }),
    ];
    expect(vendorArtifactFor('b', { extends: 'oci://v1' }, [mismatch])).toEqual(
      { digest: null, miss: 'extends-mismatch' },
    );
    expect(
      vendorArtifactFor('b', { extends: 'oci://v1' }, [
        mismatch,
        [report({ source: 'oci://v1', artifactDigest: 'sha256:direct' })],
      ]).digest,
    ).toBe('sha256:direct');
    expect(vendorArtifactFor('b', { extends: 'oci://v1' }, [null])).toEqual({
      digest: null,
      miss: 'no-report',
    });
    expect(
      vendorArtifactFor('b', { extends: 'oci://v1' }, [
        [report({ source: 'inline:b' })],
      ]).miss,
    ).toBe('no-digest');
    expect(sourceArtifact('oci://v1', [report({ source: 'oci://v1' })])).toBe(
      null,
    );
  });

  it('finds the vendor tests of a package or file stem', () => {
    const files = [
      f('ssh.rego', 'compliance_framework.ssh'),
      f('ssh_test.rego', 'compliance_framework.ssh'),
      f('other_test.rego', 'compliance_framework.ssh_test'),
      f('x_test.rego', 'compliance_framework.x'),
    ];
    expect(
      vendorTestsFor('compliance_framework.ssh', 'ssh.rego', files).map(
        (x) => x.path,
      ),
    ).toEqual(['ssh_test.rego', 'other_test.rego']);
    expect(vendorTestsFor(null, 'x.rego', files).map((x) => x.path)).toEqual([
      'x_test.rego',
    ]);
  });

  it('changedLeafPaths lists differing leaves (arrays whole)', () => {
    expect(
      changedLeafPaths(
        { verbosity: 1, plugins: { a: { policies: ['x'] } } },
        { plugins: { a: { policies: ['x', 'y'] }, b: { source: 's' } } },
      ),
    ).toEqual(['/plugins/a/policies', '/plugins/b/source', '/verbosity']);
  });
});
