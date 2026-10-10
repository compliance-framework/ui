// Client-only checks (R89); every other rule comes from the API preview.
import { describe, expect, it } from 'vitest';
import type { OverlayDoc } from '@/types/agent-config';
import {
  byteSize,
  coerceStringMaps,
  validateOverlayClientSide,
} from '../validation';
import { parseYaml } from '../yaml';

function find(overlay: OverlayDoc, ptr: string) {
  return validateOverlayClientSide(overlay).filter((i) => i.ptr === ptr);
}

describe('validateOverlayClientSide (R89: client-only checks)', () => {
  it('leaves the API rules to the preview', () => {
    expect(
      validateOverlayClientSide({
        api: null,
        verbosity: 9,
        plugins: { Bad: { schedule: 'nope', config: { port: '22' } } },
      } as OverlayDoc),
    ).toEqual([]);
  });

  it('blocks a non-mapping overlay', () => {
    expect(
      validateOverlayClientSide([] as unknown as OverlayDoc)[0],
    ).toMatchObject({ ptr: '', blocking: true });
  });

  it('blocks a masked value copied from a report', () => {
    const i = find(
      { plugins: { ssh: { config: { password: '••••' } } } },
      '/plugins/ssh/config/password',
    );
    expect(i.some((x) => x.blocking && /masked/.test(x.message))).toBe(true);
  });

  it('blocks object/array config values', () => {
    const o = {
      plugins: { ssh: { config: { k: { a: 1 } } } },
    } as unknown as OverlayDoc;
    expect(find(o, '/plugins/ssh/config/k')[0].blocking).toBe(true);
  });

  it('only coerces booleans; every number must be quoted', () => {
    const o = {
      plugins: { ssh: { config: { v: 1.1, big: 2 ** 60, n: 22, on: true } } },
    } as unknown as OverlayDoc;
    const c = coerceStringMaps(o);
    expect(c.coerced).toEqual(['/plugins/ssh/config/on']);
    const issues = validateOverlayClientSide(c.overlay);
    expect(
      issues
        .filter((i) => i.blocking && /Quote this value/.test(i.message))
        .map((i) => i.ptr),
    ).toEqual([
      '/plugins/ssh/config/v',
      '/plugins/ssh/config/big',
      '/plugins/ssh/config/n',
    ]);
  });

  it.each(['1.0', '1e3'])(
    'blocks the YAML number %s instead of sending a different string',
    (text) => {
      const r = parseYaml(`plugins:\n  ssh:\n    config:\n      v: ${text}\n`);
      if (!r.ok) throw new Error(r.error.message);
      const c = coerceStringMaps(r.value);
      expect(c.coerced).toEqual([]);
      expect(find(c.overlay, '/plugins/ssh/config/v')).toEqual([
        {
          ptr: '/plugins/ssh/config/v',
          message: expect.stringMatching(/Quote this value/),
          blocking: true,
        },
      ]);
    },
  );

  it.each(['0644', '0x1F', '01234'])(
    'the YAML parser already rejects the ambiguous number %s',
    (text) => {
      expect(
        parseYaml(`plugins:\n  ssh:\n    config:\n      v: ${text}\n`).ok,
      ).toBe(false);
    },
  );

  it('blocks numbers JSON cannot carry as typed, in every field', () => {
    // Raw JSON views: JSON.parse gives Infinity for 1e999 and rounds 20-digit integers.
    const o = JSON.parse(
      '{"verbosity": 1e999, "plugins": {"p": {"policy_data": {"limit": 1e999, "id": 12345678901234567890, "ok": [1, 2.5, -0, 9007199254740991]}}}}',
    ) as OverlayDoc;
    (o.plugins!.p!.policy_data as Record<string, unknown>).nan = NaN;
    const ptrs = validateOverlayClientSide(o)
      .filter((i) => i.blocking && /cannot be saved as typed/.test(i.message))
      .map((i) => i.ptr);
    expect(ptrs).toEqual([
      '/verbosity',
      '/plugins/p/policy_data/limit',
      '/plugins/p/policy_data/id',
      '/plugins/p/policy_data/nan',
    ]);
  });
});

describe('coerceStringMaps (R27)', () => {
  it('converts booleans (not numbers) in config and labels and reports pointers', () => {
    const o = {
      plugins: {
        ssh: {
          config: { port: 2222, on: true, s: 'x' },
          labels: { n: 1, off: false },
        },
      },
    } as unknown as OverlayDoc;
    const r = coerceStringMaps(o);
    expect(r.overlay).toEqual({
      plugins: {
        ssh: {
          config: { port: 2222, on: 'true', s: 'x' },
          labels: { n: 1, off: 'false' },
        },
      },
    });
    expect(r.coerced).toEqual([
      '/plugins/ssh/config/on',
      '/plugins/ssh/labels/off',
    ]);
    expect(
      (o.plugins as Record<string, { config: Record<string, unknown> }>).ssh
        .config.on,
    ).toBe(true);
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
