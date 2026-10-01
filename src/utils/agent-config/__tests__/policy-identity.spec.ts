// R74/R77/R78: evidence identity of policy modules (design §13.4); R82 (§13.5).
import { describe, expect, it } from 'vitest';
import {
  cleanPath,
  continuityPolicyId,
  declaredPolicyId,
  forkMessage,
  inheritedStreamIdentity,
  inlinePluginPath,
  joinPath,
  modulePackage,
  pluginPathFor,
  vendorPluginPathFor,
  policyIdRules,
  seedPath,
  streamIdentity,
} from '../policy-identity';

const VENDOR =
  '.compliance-framework/policies/compliance-framework/plugin-local-ssh-policies/v0.2.0/policies';
/** R82 (b): the relative path plugins load inline bundle `ssh` from. */
const INLINE = '.compliance-framework/policies/inline/ssh/policies';

const VENDOR_SRC = `package compliance_framework.deny_password_auth

import rego.v1

title := "SSH denies password authentication"

violation[{"id": "password-auth", "title": "Password auth is on"}] if {
\tinput.password_authentication == "yes"
}
`;

describe('path helpers (Go path.Clean / path.Join)', () => {
  it.each([
    ['', '.'],
    ['./x', 'x'],
    ['x/', 'x'],
    ['x//a.rego', 'x/a.rego'],
    ['/abs/x/../y', '/abs/y'],
    ['../a', '../a'],
    ['/', '/'],
  ])('clean(%j) = %j', (p, want) => expect(cleanPath(p)).toBe(want));

  it('joins and cleans', () => {
    expect(joinPath('./x', 'a.rego')).toBe('x/a.rego');
    expect(joinPath('', 'a.rego')).toBe('a.rego');
    expect(joinPath('', '')).toBe('');
  });
});

describe('seedPath (port of api policyeval.SeedPath, f50e4d8)', () => {
  it('keeps the legacy pair without a policy_id', () => {
    expect(seedPath(null, `${VENDOR}/a.rego`, VENDOR)).toEqual([
      `${VENDOR}/a.rego`,
      VENDOR,
    ]);
    expect(seedPath('', 'x/a.rego', './x')).toEqual(['x/a.rego', './x']);
  });

  it('an id equal to the file, or that cleans to it, keeps the legacy pair', () => {
    for (const policyPath of ['./x', './x/', 'x/', 'x', '/abs/x/']) {
      const file = joinPath(policyPath, 'deny/a.rego');
      for (const id of [file, `${policyPath}/deny/a.rego`]) {
        expect(seedPath(id, file, policyPath)).toEqual([file, policyPath]);
      }
    }
  });

  it('another location: cleaned file, raw path trimmed by the bundle-relative file', () => {
    const id = continuityPolicyId(VENDOR, 'a.rego');
    expect(seedPath(id, `${INLINE}/a.rego`, INLINE)).toEqual([
      `${VENDOR}/a.rego`,
      VENDOR,
    ]);
    // A literal un-cleaned plugin path survives in the path seed.
    expect(seedPath('./x/a.rego', `${INLINE}/a.rego`, INLINE)).toEqual([
      'x/a.rego',
      './x',
    ]);
  });

  it('an opaque id is both seeds', () => {
    expect(
      seedPath('ssh-deny-password-auth', `${INLINE}/a.rego`, INLINE),
    ).toEqual(['ssh-deny-password-auth', 'ssh-deny-password-auth']);
  });

  it('an over-long id counts as none', () => {
    const id = 'x'.repeat(513);
    expect(seedPath(id, 'p/a.rego', 'p')).toEqual(['p/a.rego', 'p']);
  });
});

describe('continuity policy_id (R77 correction)', () => {
  it('is the LITERAL plugin path + "/" + file, never path.Join', () => {
    expect(continuityPolicyId('./x', 'a.rego')).toBe('./x/a.rego');
    expect(continuityPolicyId('x/', 'a.rego')).toBe('x//a.rego');
    expect(continuityPolicyId(VENDOR, 'deny/a.rego')).toBe(
      `${VENDOR}/deny/a.rego`,
    );
  });

  it('reproduces the vendor seed for un-cleaned plugin paths', () => {
    for (const vp of ['./x', 'x/', './a/b/', VENDOR]) {
      const vendor = seedPath(null, joinPath(vp, 'a.rego'), vp);
      const override = seedPath(
        continuityPolicyId(vp, 'a.rego'),
        `${INLINE}/a.rego`,
        INLINE,
      );
      expect(override).toEqual(vendor);
    }
    // path.Join would lose "./": a different _policy_path seed.
    const vendor = seedPath(null, 'x/a.rego', './x');
    expect(
      seedPath(joinPath('./x', 'a.rego'), `${INLINE}/a.rego`, INLINE),
    ).not.toEqual(vendor);
  });

  it('pluginPathFor reads the first report naming the source', () => {
    expect(
      pluginPathFor('src', [
        null,
        [{ source: 'src', digest: 'd', files: [] }],
        [{ source: 'src', digest: 'd', files: [], pluginPath: './x' }],
      ]),
    ).toBe('./x');
    expect(
      pluginPathFor('src', [[{ source: 'o', digest: 'd', files: [] }]]),
    ).toBe(null);
  });
});

describe('vendorPluginPathFor (R78)', () => {
  const ext = (bundle: string, source: string, pluginPath?: string) => ({
    source: `inline:${bundle}`,
    digest: 'd',
    files: [],
    extends: { source, digest: 'v', files: [], pluginPath },
  });

  it('prefers a report entry loading the source directly', () => {
    expect(
      vendorPluginPathFor('src', 'b', [
        [ext('b', 'src', 'from-extends')],
        [{ source: 'src', digest: 'd', files: [], pluginPath: './x' }],
      ]),
    ).toBe('./x');
  });

  it("falls back to the bundle's extends.plugin-path, then another bundle's", () => {
    expect(
      vendorPluginPathFor('src', 'b', [
        [ext('a', 'src', 'a-path'), ext('b', 'src', './own/')],
      ]),
    ).toBe('./own/');
    expect(vendorPluginPathFor('src', 'b', [[ext('a', 'src', 'a-path')]])).toBe(
      'a-path',
    );
  });

  it('ignores an extends of another source, and knows nothing without one', () => {
    expect(
      vendorPluginPathFor('src', 'b', [[ext('b', 'other', 'x')]]),
    ).toBeNull();
    expect(
      vendorPluginPathFor('src', 'b', [[ext('b', 'src')], null]),
    ).toBeNull();
  });
});

describe('reading policy_id and package', () => {
  it('reads the declared literal', () => {
    expect(declaredPolicyId('package a\npolicy_id := "x/y.rego"\n')).toBe(
      'x/y.rego',
    );
    expect(declaredPolicyId('package a\npolicy_id = `raw`\n')).toBe('raw');
    expect(declaredPolicyId(VENDOR_SRC)).toBeNull();
    expect(modulePackage(VENDOR_SRC)).toEqual({
      pkg: 'compliance_framework.deny_password_auth',
      row: 1,
    });
  });

  it('flags every shape the contract rejects', () => {
    const problems = (src: string) =>
      policyIdRules(src).map((r) => r.problem !== '');
    expect(problems('policy_id := "ok"')).toEqual([false]);
    expect(problems('policy_id := ""')).toEqual([true]);
    expect(problems(`policy_id := "${'x'.repeat(513)}"`)).toEqual([true]);
    expect(problems('policy_id := 42')).toEqual([true]);
    expect(problems('policy_id := concat("/", ["a", "b"])')).toEqual([true]);
    expect(problems('policy_id := "a" if { input.x }')).toEqual([true]);
    expect(problems('default policy_id := "a"')).toEqual([true]);
    expect(problems('policy_id contains "a" if { true }')).toEqual([true]);
    expect(problems('policy_id(x) := x')).toEqual([true]);
    // Indented lines are rule bodies, not heads.
    expect(policyIdRules('  policy_id := 1')).toEqual([]);
    // Two declarations: the module has none for identity purposes.
    expect(
      declaredPolicyId('package a\npolicy_id := "a"\npolicy_id := "b"\n'),
    ).toBeNull();
  });
});

/** `src` with `policy_id := "<id>"` after its `import rego.v1`. */
const withId = (src: string, id: string) =>
  src.replace(
    'import rego.v1\n',
    `import rego.v1\n\npolicy_id := ${JSON.stringify(id)}\n`,
  );

describe('streamIdentity of an override (R78, R82)', () => {
  const PKG = 'compliance_framework.deny_password_auth';
  const override = (
    src: string,
    o: Partial<Parameters<typeof streamIdentity>[3] & object> = {},
  ) =>
    streamIdentity('ssh', 'deny.rego', src, {
      vendorPackage: PKG,
      vendorSource: VENDOR_SRC,
      vendorPluginPath: VENDOR,
      bundlePluginPath: INLINE,
      packageModules: ['deny.rego'],
      ...o,
    });

  it('the R82 inline plugin path is relative, without the state dir', () => {
    expect(inlinePluginPath('ssh')).toBe(INLINE);
  });

  it('without a policy_id it continues the vendor stream automatically (the agent adds it)', () => {
    expect(override(VENDOR_SRC)).toEqual({
      kind: 'automatic',
      policyId: null,
      automaticId: `${VENDOR}/deny.rego`,
      fork: null,
    });
    // The agent knows its plugin path even when no instance reported it.
    expect(override(VENDOR_SRC, { vendorPluginPath: null })).toMatchObject({
      kind: 'automatic',
      automaticId: null,
      fork: null,
    });
    // Vendor source not loaded yet: the vendor has no policy_id as far as we know.
    expect(override(VENDOR_SRC, { vendorSource: undefined }).kind).toBe(
      'automatic',
    );
  });

  it('an explicit continuity id continues the vendor stream', () => {
    const src = withId(VENDOR_SRC, continuityPolicyId(VENDOR, 'deny.rego'));
    expect(override(src)).toMatchObject({ kind: 'continues', fork: null });
    // The bundle's own plugin path is not needed to tell (the R82 path is assumed).
    expect(override(src, { bundlePluginPath: null }).kind).toBe('continues');
  });

  it('an explicit policy_id that differs from the continuity id forks the stream', () => {
    const id = override(withId(VENDOR_SRC, 'something-else'));
    expect(id.kind).toBe('own');
    expect(id.fork).toEqual({
      reason: 'policy-id',
      expected: `${VENDOR}/deny.rego`,
    });
    expect(forkMessage(id.fork!, id.policyId)).toContain(
      'this starts a new evidence stream',
    );
    expect(forkMessage(id.fork!, id.policyId)).toContain(
      'remove it to let the agent continue the stream automatically',
    );
  });

  it('an explicit policy_id without a plugin path or vendor id cannot be judged', () => {
    expect(
      override(withId(VENDOR_SRC, 'mine'), { vendorPluginPath: null }),
    ).toEqual({ kind: 'own', policyId: 'mine', fork: null });
  });

  it('a vendor policy_id is the one to keep', () => {
    const vendor = withId(VENDOR_SRC, 'ssh-deny-password');
    expect(override(vendor, { vendorSource: vendor }).kind).toBe('continues');
    const changed = override(withId(VENDOR_SRC, 'mine'), {
      vendorSource: vendor,
    });
    expect(changed.fork).toEqual({
      reason: 'policy-id',
      expected: 'ssh-deny-password',
    });
    // Without a plugin path the vendor id still decides.
    expect(
      override(vendor, { vendorSource: vendor, vendorPluginPath: null }).kind,
    ).toBe('continues');
    // Dropping it: the agent's continuity id is not the vendor's id.
    const dropped = override(VENDOR_SRC, { vendorSource: vendor });
    expect(dropped).toMatchObject({
      kind: 'new',
      fork: { reason: 'no-policy-id', expected: 'ssh-deny-password' },
    });
    expect(forkMessage(dropped.fork!, null)).toContain(
      'Keep `policy_id := "ssh-deny-password"`',
    );
  });

  it('a changed package forks the stream (the agent adds nothing)', () => {
    const id = override(VENDOR_SRC.replace('deny_password_auth', 'mine'));
    expect(id).toMatchObject({
      kind: 'new',
      fork: {
        reason: 'package',
        vendorPackage: PKG,
        package: 'compliance_framework.mine',
      },
    });
    expect(forkMessage(id.fork!, id.policyId)).toContain(
      `Keep \`package ${PKG}\``,
    );
    // Even with the continuity id: the package is part of the identity.
    const withCont = override(
      withId(
        VENDOR_SRC.replace('deny_password_auth', 'mine'),
        continuityPolicyId(VENDOR, 'deny.rego'),
      ),
    );
    expect(withCont).toMatchObject({
      kind: 'own',
      fork: { reason: 'package' },
    });
  });

  it('a multi-module package is skipped by the agent: path-based, with a warning', () => {
    const id = override(VENDOR_SRC, {
      packageModules: ['deny.rego', 'deny_extra.rego'],
    });
    expect(id).toMatchObject({
      kind: 'path',
      fork: {
        reason: 'multi-module',
        package: PKG,
        modules: ['deny.rego', 'deny_extra.rego'],
      },
    });
    expect(forkMessage(id.fork!, null)).toContain(
      'the agent does not add the continuity policy_id here',
    );
    // An explicit policy_id still wins.
    expect(
      override(withId(VENDOR_SRC, continuityPolicyId(VENDOR, 'deny.rego')), {
        packageModules: ['deny.rego', 'deny_extra.rego'],
      }).kind,
    ).toBe('continues');
  });

  it('a module that overrides nothing has its own stream or a path-based one', () => {
    expect(
      streamIdentity(
        'b',
        'x.rego',
        'package compliance_framework.x\npolicy_id := "b/x.rego"\n',
      ),
    ).toEqual({ kind: 'own', policyId: 'b/x.rego', fork: null });
    expect(
      streamIdentity('b', 'x.rego', 'package compliance_framework.x\n').kind,
    ).toBe('path');
  });
});

describe('inheritedStreamIdentity (R82)', () => {
  const ctx = {
    vendorPackage: 'compliance_framework.deny_password_auth',
    vendorPluginPath: VENDOR,
    bundlePluginPath: INLINE,
    packageModules: ['deny.rego'],
  };

  it('continues the vendor stream automatically', () => {
    expect(inheritedStreamIdentity('deny.rego', ctx)).toEqual({
      kind: 'automatic',
      policyId: null,
      automaticId: `${VENDOR}/deny.rego`,
      fork: null,
    });
    expect(
      inheritedStreamIdentity('deny.rego', { ...ctx, vendorPluginPath: null })
        .kind,
    ).toBe('automatic');
  });

  it("keeps the vendor's own policy_id", () => {
    const vendor = withId(VENDOR_SRC, 'ssh-deny-password');
    expect(
      inheritedStreamIdentity('deny.rego', { ...ctx, vendorSource: vendor }),
    ).toEqual({ kind: 'continues', policyId: 'ssh-deny-password', fork: null });
  });

  it('forks when the package has several modules', () => {
    expect(
      inheritedStreamIdentity('deny.rego', {
        ...ctx,
        packageModules: ['deny.rego', 'a.rego'],
      }),
    ).toMatchObject({
      kind: 'path',
      fork: { reason: 'multi-module', modules: ['a.rego', 'deny.rego'] },
    });
  });
});
