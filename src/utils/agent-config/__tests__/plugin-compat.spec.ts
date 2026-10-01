// R79: the inline-policy gate, mirroring agent#95 cmd/compat.go pluginCompatibility.
import { describe, expect, it } from 'vitest';
import type { ConfigDoc, OverlayDoc, PluginReport } from '@/types/agent-config';
import {
  inlineBlockedReason,
  inlineGateIssues,
  inlineSupportRows,
  inlineUnknownReason,
  pluginSupport,
  type CompatInstance,
} from '../plugin-compat';

const OLD = 'ghcr.io/cf/plugin-local-ssh:v0.2.0';
const NEW = 'ghcr.io/cf/plugin-local-ssh:v0.3.0';
const POLICIES = 'ghcr.io/cf/plugin-local-ssh-policies:v0.2.0';

const base: ConfigDoc = {
  plugins: {
    ssh: { source: OLD, policies: [POLICIES] },
    other: { source: 'ghcr.io/cf/other:v1', policies: [] },
  },
};
const reports = (support: string, lib = 'v0.1.9'): PluginReport[] => [
  { name: 'ssh', source: OLD, libVersion: lib, inlinePolicies: support },
  {
    name: 'other',
    source: 'ghcr.io/cf/other:v1',
    libVersion: 'v0.9.0',
    inlinePolicies: 'supported',
  },
];
const inst = (
  plugins: PluginReport[] | null,
  b: ConfigDoc | null = base,
  id = 'i1',
): CompatInstance => ({
  instanceId: id,
  hostname: `host-${id}`,
  base: b,
  plugins,
});
const assignOverlay: OverlayDoc = {
  plugins: { ssh: { policies: ['inline:tuned'] } },
  policy_bundles: { tuned: { extends: POLICIES } },
};

describe('pluginSupport', () => {
  it("uses the plugin's own report while it runs the reported source", () => {
    expect(pluginSupport(reports('unsupported'), 'ssh', OLD)).toEqual({
      support: 'unsupported',
      lib: 'v0.1.9',
    });
  });

  it('judges a changed source by another plugin running that build, else knows nothing', () => {
    const r: PluginReport[] = [
      ...reports('unsupported'),
      { name: 'ssh2', source: NEW, libVersion: '', inlinePolicies: 'unknown' },
    ];
    expect(pluginSupport(r, 'ssh', NEW)).toEqual({
      support: 'unknown',
      lib: '',
    });
    expect(pluginSupport(reports('unsupported'), 'ssh', NEW)).toBeNull();
  });

  it('knows nothing from older agents', () => {
    expect(pluginSupport(null, 'ssh', OLD)).toBeNull();
    expect(
      pluginSupport([{ name: 'ssh', source: OLD }], 'ssh', OLD),
    ).toBeNull();
  });
});

describe('inlineGateIssues', () => {
  it('blocks an overlay that gives an unsupported plugin an inline bundle', () => {
    const issues = inlineGateIssues(assignOverlay, [
      inst(reports('unsupported')),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      plugin: 'ssh',
      blocking: true,
      bundles: ['tuned'],
      message:
        "plugin ssh (agent lib v0.1.9) doesn't support inline policies; upgrade the plugin to a build on agent ≥ v0.9.0",
    });
  });

  it('blocks an overlay that changes an inline bundle the file assigns', () => {
    const fileInline: ConfigDoc = {
      plugins: { ssh: { source: OLD, policies: ['inline:file-b'] } },
      policy_bundles: { 'file-b': { modules: { 'a.rego': 'package a' } } },
    };
    const touch: OverlayDoc = {
      policy_bundles: { 'file-b': { modules: { 'b.rego': 'package b' } } },
    };
    expect(
      inlineGateIssues(touch, [inst(reports('unsupported'), fileInline)])[0]
        .blocking,
    ).toBe(true);
    // Untouched, it comes from the file: a warning only (R34).
    const other: OverlayDoc = { verbosity: 1 };
    const [w] = inlineGateIssues(other, [
      inst(reports('unsupported'), fileInline),
    ]);
    expect(w.blocking).toBe(false);
  });

  it('blocks a source change to an unsupported build of a plugin using inline bundles', () => {
    const fileInline: ConfigDoc = {
      plugins: { ssh: { source: NEW, policies: ['inline:file-b'] } },
      policy_bundles: { 'file-b': { modules: { 'a.rego': 'package a' } } },
    };
    const r: PluginReport[] = [
      {
        name: 'ssh',
        source: NEW,
        libVersion: 'v0.9.0',
        inlinePolicies: 'supported',
      },
      {
        name: 'legacy',
        source: OLD,
        libVersion: 'v0.1.9',
        inlinePolicies: 'unsupported',
      },
    ];
    const [issue] = inlineGateIssues({ plugins: { ssh: { source: OLD } } }, [
      inst(r, fileInline),
    ]);
    expect(issue).toMatchObject({ plugin: 'ssh', blocking: true });
  });

  // Like the agent (overlayTouched = DiffJSON(file, file ⊕ overlay)), "introduced" is
  // relative to each instance's file: re-stating the file's value changes nothing.
  const fileB: ConfigDoc = {
    plugins: { ssh: { source: OLD, policies: ['inline:file-b'] } },
    policy_bundles: { 'file-b': { modules: { 'a.rego': 'package a' } } },
  };

  it("only warns when the overlay re-states the file's source and bundle", () => {
    const restate: OverlayDoc = {
      plugins: { ssh: { source: OLD, policies: ['inline:file-b'] } },
      policy_bundles: { 'file-b': { modules: { 'a.rego': 'package a' } } },
    };
    const [w] = inlineGateIssues(restate, [
      inst(reports('unsupported'), fileB),
    ]);
    expect(w).toMatchObject({ plugin: 'ssh', blocking: false });
  });

  it('blocks when the re-stated bundle or source differs from the file', () => {
    const bundle: OverlayDoc = {
      policy_bundles: { 'file-b': { modules: { 'a.rego': 'package a2' } } },
    };
    expect(
      inlineGateIssues(bundle, [inst(reports('unsupported'), fileB)])[0]
        .blocking,
    ).toBe(true);
    const r: PluginReport[] = [
      ...reports('unsupported'),
      {
        name: 'x',
        source: NEW,
        libVersion: 'v0.1.9',
        inlinePolicies: 'unsupported',
      },
    ];
    expect(
      inlineGateIssues({ plugins: { ssh: { source: NEW } } }, [
        inst(r, fileB),
      ])[0].blocking,
    ).toBe(true);
  });

  it("decides per instance against that instance's file", () => {
    const fileNew: ConfigDoc = {
      ...fileB,
      plugins: { ssh: { source: NEW, policies: ['inline:file-b'] } },
    };
    const r: PluginReport[] = [
      {
        name: 'ssh',
        source: OLD,
        libVersion: 'v0.1.9',
        inlinePolicies: 'unsupported',
      },
      {
        name: 'x',
        source: NEW,
        libVersion: 'v0.1.9',
        inlinePolicies: 'unsupported',
      },
    ];
    // The pin matches a's file (no change there) and changes b's source.
    const pin: OverlayDoc = { plugins: { ssh: { source: OLD } } };
    const issues = inlineGateIssues(pin, [
      inst(r, fileB, 'a'),
      inst(r, fileNew, 'b'),
    ]);
    expect(issues.map((i) => [i.instanceId, i.blocking])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  it('warns, never blocks, for an unknown library', () => {
    const [w] = inlineGateIssues(assignOverlay, [inst(reports('unknown', ''))]);
    expect(w.blocking).toBe(false);
    expect(w.message).toContain('unknown');
  });

  it('says nothing for supported or disabled plugins, or without reports', () => {
    expect(
      inlineGateIssues(assignOverlay, [inst(reports('supported', 'v0.9.0'))]),
    ).toEqual([]);
    expect(
      inlineGateIssues(
        {
          ...assignOverlay,
          plugins: { ssh: { enabled: false, policies: ['inline:tuned'] } },
        },
        [inst(reports('unsupported'))],
      ),
    ).toEqual([]);
    expect(inlineGateIssues(assignOverlay, [inst(null)])).toEqual([]);
  });

  it('checks each instance (replicas on different builds)', () => {
    const issues = inlineGateIssues(assignOverlay, [
      inst(reports('supported', 'v0.9.0'), base, 'a'),
      inst(reports('unsupported'), base, 'b'),
    ]);
    expect(issues.map((i) => [i.instanceId, i.blocking])).toEqual([
      ['b', true],
    ]);
  });
});

describe('per-plugin reasons and the review rows', () => {
  const instances = [
    inst(reports('supported', 'v0.9.0'), base, 'a'),
    inst(reports('unsupported'), base, 'b'),
  ];

  it('names the blocked plugin, and only it', () => {
    expect(inlineBlockedReason('ssh', instances, {})).toContain(
      'plugin ssh (agent lib v0.1.9)',
    );
    expect(inlineBlockedReason('other', instances, {})).toBeNull();
    expect(
      inlineUnknownReason('ssh', [inst(reports('unknown', ''))], {}),
    ).toContain('unknown');
  });

  it('lists per-instance support and flags divergence', () => {
    const rows = inlineSupportRows(assignOverlay, instances);
    expect(rows).toHaveLength(1);
    expect(rows[0].plugin).toBe('ssh');
    expect(rows[0].divergent).toBe(true);
    expect(rows[0].instances.map((i) => i.support)).toEqual([
      'supported',
      'unsupported',
    ]);
  });
});
