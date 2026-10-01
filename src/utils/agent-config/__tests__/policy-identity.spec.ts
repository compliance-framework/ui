// R74/R77/R78: evidence identity of policy modules (design §13.4).
import { describe, expect, it } from 'vitest';
import {
  cleanPath,
  continuityPolicyId,
  declaredPolicyId,
  forkMessage,
  insertPolicyId,
  joinPath,
  modulePackage,
  pluginPathFor,
  policyIdRules,
  seedPath,
  streamIdentity,
} from '../policy-identity';

const VENDOR =
  '.compliance-framework/policies/compliance-framework/plugin-local-ssh-policies/v0.2.0/policies';
const INLINE =
  '/app/.compliance-framework/state/local-dev/inline/ssh/current/bundle';

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

describe('insertPolicyId (R78 Override)', () => {
  it('inserts the declaration after the imports', () => {
    const out = insertPolicyId(VENDOR_SRC, `${VENDOR}/deny.rego`);
    expect(out).toContain(
      `import rego.v1\n\npolicy_id := ${JSON.stringify(`${VENDOR}/deny.rego`)}\n\ntitle := `,
    );
    expect(declaredPolicyId(out)).toBe(`${VENDOR}/deny.rego`);
  });

  it('after the last of several imports, or the package line without imports', () => {
    expect(
      insertPolicyId(
        'package a\n\nimport rego.v1\nimport data.lib.x\n\nallow := true\n',
        'id',
      ),
    ).toBe(
      'package a\n\nimport rego.v1\nimport data.lib.x\n\npolicy_id := "id"\n\nallow := true\n',
    );
    expect(insertPolicyId('package a\nallow := true\n', 'id')).toBe(
      'package a\n\npolicy_id := "id"\n\nallow := true\n',
    );
  });

  it('keeps a module that already declares a policy_id', () => {
    const src = 'package a\n\nimport rego.v1\n\npolicy_id := "vendor-id"\n';
    expect(insertPolicyId(src, 'other')).toBe(src);
  });

  it('escapes the id as a Rego string', () => {
    expect(insertPolicyId('package a\n', 'C:\\x"y')).toContain(
      'policy_id := "C:\\\\x\\"y"',
    );
  });
});

describe('streamIdentity (R78)', () => {
  const override = (
    src: string,
    o: Partial<Parameters<typeof streamIdentity>[3] & object> = {},
  ) =>
    streamIdentity('ssh', 'deny.rego', src, {
      vendorPackage: 'compliance_framework.deny_password_auth',
      vendorSource: VENDOR_SRC,
      vendorPluginPath: VENDOR,
      bundlePluginPath: INLINE,
      ...o,
    });

  it('an override with the continuity id continues the vendor stream', () => {
    const src = insertPolicyId(
      VENDOR_SRC,
      continuityPolicyId(VENDOR, 'deny.rego'),
    );
    expect(override(src)).toMatchObject({ kind: 'continues', fork: null });
    // The bundle's own plugin path is not needed to tell.
    expect(override(src, { bundlePluginPath: null }).kind).toBe('continues');
  });

  it('an override without a policy_id starts a new path-based stream', () => {
    const id = override(VENDOR_SRC);
    expect(id.kind).toBe('path');
    expect(id.fork).toEqual({
      reason: 'no-policy-id',
      expected: `${VENDOR}/deny.rego`,
    });
    expect(forkMessage(id.fork!, null, 'oci://x')).toContain(
      'this starts a new evidence stream',
    );
  });

  it('without a reported plugin path it says the stream is new', () => {
    const id = override(VENDOR_SRC, { vendorPluginPath: null });
    expect(id.fork?.reason).toBe('unknown-plugin-path');
    expect(forkMessage(id.fork!, null, 'oci://x')).toContain(
      'evidence for this override will start a new stream',
    );
  });

  it('a changed or removed policy_id forks the stream', () => {
    const src = insertPolicyId(VENDOR_SRC, 'something-else');
    const id = override(src);
    expect(id.kind).toBe('own');
    expect(id.fork).toEqual({
      reason: 'policy-id',
      expected: `${VENDOR}/deny.rego`,
    });
  });

  it('a vendor policy_id is the one to keep', () => {
    const vendor = insertPolicyId(VENDOR_SRC, 'ssh-deny-password');
    expect(override(vendor, { vendorSource: vendor }).kind).toBe('continues');
    const changed = override(insertPolicyId(VENDOR_SRC, 'mine'), {
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
  });

  it('a changed package forks the stream', () => {
    const src = insertPolicyId(
      VENDOR_SRC.replace('deny_password_auth', 'mine'),
      continuityPolicyId(VENDOR, 'deny.rego'),
    );
    const id = override(src);
    expect(id.fork).toMatchObject({
      reason: 'package',
      vendorPackage: 'compliance_framework.deny_password_auth',
      package: 'compliance_framework.mine',
    });
    expect(forkMessage(id.fork!, id.policyId, null)).toContain(
      'Keep `package compliance_framework.deny_password_auth`',
    );
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
