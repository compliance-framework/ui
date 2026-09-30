import { describe, expect, it } from 'vitest';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import {
  byteSize,
  coerceStringMaps,
  hasBlocking,
  modulePathError,
  validateOverlayClientSide,
} from '../validation';

const base: ConfigDoc = {
  plugins: {
    ssh: {
      source: 'ghcr.io/x/ssh:v1',
      policies: ['ghcr.io/x/ssh-policies:v1'],
      config: { password: '${env:SSH_PASSWORD}' },
    },
  },
};

function issuesFor(overlay: OverlayDoc, bases: ConfigDoc[] = [base]) {
  return validateOverlayClientSide(overlay, bases);
}

function find(overlay: OverlayDoc, ptr: string, bases?: ConfigDoc[]) {
  return issuesFor(overlay, bases).filter((i) => i.ptr === ptr);
}

describe('validateOverlayClientSide (U2.6)', () => {
  it('accepts a valid overlay', () => {
    expect(
      issuesFor({
        verbosity: 2,
        plugins: { ssh: { schedule: '*/5 * * * *', config: { port: '22' } } },
      }),
    ).toEqual([]);
  });

  it.each(['api', 'daemon', 'remote_config'])(
    'blocks the locked key %s even when null',
    (k) => {
      expect(find({ [k]: null } as OverlayDoc, `/${k}`)[0]?.blocking).toBe(
        true,
      );
    },
  );

  it('blocks a masked value copied from a report', () => {
    const i = find(
      { plugins: { ssh: { config: { password: '••••' } } } },
      '/plugins/ssh/config/password',
    );
    expect(i.some((x) => x.blocking && /masked/.test(x.message))).toBe(true);
  });

  it('blocks a bad plugin name', () => {
    expect(
      find({ plugins: { GitHub: { source: 's' } } }, '/plugins/GitHub')[0]
        .blocking,
    ).toBe(true);
  });

  it('blocks a new plugin without a source, and inline: sources', () => {
    expect(
      find(
        { plugins: { neu: { schedule: '@hourly' } } },
        '/plugins/neu/source',
      )[0].blocking,
    ).toBe(true);
    expect(
      find(
        { plugins: { ssh: { schedule: '@hourly' } } },
        '/plugins/ssh/source',
      ),
    ).toEqual([]);
    expect(
      find(
        { plugins: { ssh: { source: 'inline:b' } } },
        '/plugins/ssh/source',
      )[0].blocking,
    ).toBe(true);
  });

  it('blocks an invalid schedule', () => {
    expect(
      find(
        { plugins: { ssh: { schedule: 'nightly' } } },
        '/plugins/ssh/schedule',
      )[0].blocking,
    ).toBe(true);
  });

  it('blocks protocol_version outside {1, 2} (explicit 0 included) but allows null', () => {
    const bad = {
      plugins: { ssh: { protocol_version: 0 } },
    } as unknown as OverlayDoc;
    expect(find(bad, '/plugins/ssh/protocol_version')[0].blocking).toBe(true);
    expect(
      find(
        { plugins: { ssh: { protocol_version: null } } },
        '/plugins/ssh/protocol_version',
      ),
    ).toEqual([]);
  });

  it('blocks verbosity outside 0–2', () => {
    expect(find({ verbosity: 3 }, '/verbosity')[0].blocking).toBe(true);
    expect(find({ verbosity: 1.5 }, '/verbosity')[0].blocking).toBe(true);
  });

  it('blocks object/array config values after coercion', () => {
    const o = {
      plugins: { ssh: { config: { k: { a: 1 } } } },
    } as unknown as OverlayDoc;
    expect(find(o, '/plugins/ssh/config/k')[0].blocking).toBe(true);
  });

  it('warns (non-blocking) on config keys with dots or upper case', () => {
    const i = find(
      { plugins: { ssh: { config: { 'My.Key': 'v' } } } },
      '/plugins/ssh/config/My.Key',
    );
    expect(i[0].blocking).toBe(false);
  });

  it('blocks ${env:} outside plugin config values and CCF_API_AUTH_*', () => {
    expect(
      find(
        { plugins: { ssh: { labels: { a: '${env:X}' } } } },
        '/plugins/ssh/labels/a',
      )[0].blocking,
    ).toBe(true);
    expect(
      find(
        {
          plugins: {
            ssh: { config: { s: '${env:CCF_API_AUTH_CLIENT_SECRET}' } },
          },
        },
        '/plugins/ssh/config/s',
      )[0].blocking,
    ).toBe(true);
  });

  it('hints (non-blocking) a new ${env:} placeholder vs the base', () => {
    const fresh = find(
      { plugins: { ssh: { config: { token: '${env:TOKEN}' } } } },
      '/plugins/ssh/config/token',
    );
    expect(fresh).toHaveLength(1);
    expect(fresh[0].blocking).toBe(false);
    const same = find(
      { plugins: { ssh: { config: { password: 'x-${env:SSH_PASSWORD}' } } } },
      '/plugins/ssh/config/password',
    );
    expect(same).toEqual([]);
  });

  it('blocks oversize overlays (256 KiB without bundles)', () => {
    const big = {
      plugins: { ssh: { config: { blob: 'x'.repeat(300 * 1024) } } },
    };
    expect(find(big, '')[0].blocking).toBe(true);
  });
});

describe('validateOverlayClientSide bundles (U4.6)', () => {
  const b = (bundle: unknown, extra: OverlayDoc = {}) =>
    ({ policy_bundles: { tuned: bundle }, ...extra }) as OverlayDoc;

  it('blocks bad bundle names and module paths', () => {
    expect(
      find(
        { policy_bundles: { Bad: { modules: { 'a.rego': 'package a' } } } },
        '/policy_bundles/Bad',
      )[0].blocking,
    ).toBe(true);
    for (const p of ['/abs.rego', 'a/../b.rego', 'x.txt', 'dir/notdata.json']) {
      expect(modulePathError(p)).not.toBeNull();
    }
    expect(modulePathError('dir/data.yaml')).toBeNull();
    expect(modulePathError('checks/ssh.rego')).toBeNull();
  });

  it('blocks data + root data.json, delete without extends, delete ∩ modules, inline extends, empty bundle', () => {
    expect(
      hasBlocking(
        issuesFor(b({ data: { a: 1 }, modules: { 'data.json': '{}' } })),
      ),
    ).toBe(true);
    expect(
      hasBlocking(
        issuesFor(
          b({ modules: { 'a.rego': 'package a' }, delete: ['x.rego'] }),
        ),
      ),
    ).toBe(true);
    expect(
      find(
        b({
          extends: 'oci',
          modules: { 'x.rego': 'package x' },
          delete: ['x.rego'],
        }),
        '/policy_bundles/tuned/modules/x.rego',
      )[0].blocking,
    ).toBe(true);
    expect(
      find(b({ extends: 'inline:other' }), '/policy_bundles/tuned/extends')[0]
        .blocking,
    ).toBe(true);
    expect(find(b({}), '/policy_bundles/tuned')[0].blocking).toBe(true);
  });

  it('blocks oversize modules', () => {
    const i = find(
      b({ modules: { 'a.rego': 'package a\n' + '#'.repeat(257 * 1024) } }),
      '/policy_bundles/tuned/modules/a.rego',
    );
    expect(i.some((x) => x.blocking)).toBe(true);
  });

  it('blocks an inline: reference to a missing bundle', () => {
    const i = find(
      { plugins: { ssh: { policies: ['inline:nope'] } } },
      '/plugins/ssh/policies',
    );
    expect(i[0].blocking).toBe(true);
  });

  it('hints (non-blocking) a missing package, forbidden builtins, cross-bundle imports and double loading', () => {
    const o = b(
      {
        extends: 'ghcr.io/x/ssh-policies:v1',
        modules: {
          'a.rego': 'import rego.v1\nallow if true\n',
          'b.rego':
            'package b\n\nimport data.other.lib\n\nx := http.send({})\n',
        },
      },
      {
        plugins: {
          ssh: { policies: ['ghcr.io/x/ssh-policies:v1', 'inline:tuned'] },
        },
      },
    );
    const issues = validateOverlayClientSide(o, [base], {
      vendorPackages: () => ['compliance_framework.ssh'],
    });
    expect(issues.filter((i) => i.blocking)).toEqual([]);
    const msgs = issues.map((i) => i.message).join('\n');
    expect(msgs).toMatch(/no package line/);
    expect(msgs).toMatch(/http\.send/);
    expect(msgs).toMatch(/imports across bundles/);
    expect(msgs).toMatch(/Both the vendor bundle/);
  });
});

describe('coerceStringMaps (R27)', () => {
  it('converts scalars in config and labels and reports pointers', () => {
    const o = {
      plugins: {
        ssh: { config: { port: 2222, on: true, s: 'x' }, labels: { n: 1 } },
      },
    } as unknown as OverlayDoc;
    const r = coerceStringMaps(o);
    expect(r.overlay).toEqual({
      plugins: {
        ssh: {
          config: { port: '2222', on: 'true', s: 'x' },
          labels: { n: '1' },
        },
      },
    });
    expect(r.coerced).toEqual([
      '/plugins/ssh/config/port',
      '/plugins/ssh/config/on',
      '/plugins/ssh/labels/n',
    ]);
    expect(
      (o.plugins as Record<string, { config: Record<string, unknown> }>).ssh
        .config.port,
    ).toBe(2222);
  });

  it('returns the same object when nothing changes', () => {
    const o = { plugins: { ssh: { config: { port: '22' } } } };
    expect(coerceStringMaps(o).overlay).toBe(o);
  });
});

describe('byteSize', () => {
  it('counts UTF-8 bytes', () => {
    expect(byteSize('••••')).toBe(12);
  });
});

describe('validateOverlayClientSide mirrors the API rules (self-review)', () => {
  it('R59: problems already in the host file never block an unrelated edit', () => {
    const bad: ConfigDoc = {
      ...base,
      policy_bundles: { x: { modules: { 'data.json': '{}' }, data: { a: 1 } } },
    };
    const issues = validateOverlayClientSide({ verbosity: 1 }, [bad]);
    expect(
      issues.find((i) => i.ptr === '/policy_bundles/x/data'),
    ).toMatchObject({ blocking: false });
    expect(hasBlocking(issues)).toBe(false);
    // …but an overlay that introduces the same kind of problem still blocks.
    const introduced = validateOverlayClientSide(
      {
        policy_bundles: {
          y: { modules: { 'data.json': '{}' }, data: { a: 1 } },
        },
      },
      [bad],
    );
    expect(
      introduced.find((i) => i.ptr === '/policy_bundles/y/data')?.blocking,
    ).toBe(true);
  });

  it('standalone (no known base): a plugin without a source is only a hint', () => {
    const issues = validateOverlayClientSide(
      { plugins: { ssh: { config: { port: '2' } } } },
      [],
    );
    expect(issues.find((i) => i.ptr === '/plugins/ssh/source')).toMatchObject({
      blocking: false,
    });
  });

  it('source: null on a file plugin blocks when a base is known', () => {
    const issues = validateOverlayClientSide(
      { plugins: { ssh: { source: null } } } as unknown as OverlayDoc,
      [base],
    );
    expect(issues.find((i) => i.ptr === '/plugins/ssh/source')?.blocking).toBe(
      true,
    );
  });

  it('treats the forbidden env prefix case-insensitively', () => {
    const i = validateOverlayClientSide(
      {
        plugins: {
          ssh: { config: { s: '${env:ccf_api_auth_client_secret}' } },
        },
      },
      [base],
    );
    expect(i.some((x) => x.blocking && /not allowed/.test(x.message))).toBe(
      true,
    );
  });

  it('interval: trims surrounding spaces, rejects negatives', () => {
    expect(
      validateOverlayClientSide({ agent_evidence: { interval: ' 5m ' } }, [
        base,
      ]),
    ).toEqual([]);
    expect(
      validateOverlayClientSide({ agent_evidence: { interval: '-5m' } }, [
        base,
      ])[0],
    ).toMatchObject({
      blocking: true,
      message: 'The interval must not be negative',
    });
  });

  it('blocks an empty extends and data files that do not parse', () => {
    const e = validateOverlayClientSide(
      {
        policy_bundles: {
          b: { extends: ' ', modules: { 'a.rego': 'package a' } },
        },
      },
      [base],
    );
    expect(e.find((i) => i.ptr === '/policy_bundles/b/extends')?.blocking).toBe(
      true,
    );
    const d = validateOverlayClientSide(
      {
        policy_bundles: {
          b: { modules: { 'data.json': '{nope', 'x/data.yaml': 'a: [1' } },
        },
      },
      [base],
    );
    expect(
      d.filter((i) => i.blocking && /does not parse/.test(i.message)),
    ).toHaveLength(2);
  });

  it('only coerces booleans and safe integers; other numbers must be quoted', () => {
    const o = {
      plugins: { ssh: { config: { v: 1.1, big: 2 ** 60, ok: 22 } } },
    } as unknown as OverlayDoc;
    const c = coerceStringMaps(o);
    expect(c.coerced).toEqual(['/plugins/ssh/config/ok']);
    const issues = validateOverlayClientSide(c.overlay, [base]);
    expect(
      issues
        .filter((i) => i.blocking && /Quote this value/.test(i.message))
        .map((i) => i.ptr),
    ).toEqual(['/plugins/ssh/config/v', '/plugins/ssh/config/big']);
  });
  it('a file plugin that already lacks a source does not block when the overlay touches it', () => {
    const noSource: ConfigDoc = {
      plugins: { legacy: { schedule: '@hourly' } },
    };
    const issues = validateOverlayClientSide(
      { plugins: { legacy: { schedule: '@daily' } } },
      [noSource],
    );
    expect(
      issues.find((x) => x.ptr === '/plugins/legacy/source'),
    ).toMatchObject({ blocking: false });
  });
});
