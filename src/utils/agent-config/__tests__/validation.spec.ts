// Client-only checks (R89); every other rule comes from the API preview.
import { describe, expect, it } from 'vitest';
import type { OverlayDoc } from '@/types/agent-config';
import {
  byteSize,
  coerceStringMaps,
  validateOverlayClientSide,
} from '../validation';

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

  it('only coerces booleans and safe integers; other numbers must be quoted', () => {
    const o = {
      plugins: { ssh: { config: { v: 1.1, big: 2 ** 60, ok: 22 } } },
    } as unknown as OverlayDoc;
    const c = coerceStringMaps(o);
    expect(c.coerced).toEqual(['/plugins/ssh/config/ok']);
    const issues = validateOverlayClientSide(c.overlay);
    expect(
      issues
        .filter((i) => i.blocking && /Quote this value/.test(i.message))
        .map((i) => i.ptr),
    ).toEqual(['/plugins/ssh/config/v', '/plugins/ssh/config/big']);
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
