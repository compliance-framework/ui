import { describe, expect, it } from 'vitest';
import { parseYaml, toYaml } from '../yaml';

describe('yaml', () => {
  it('keeps dates and yes/no as strings (CORE_SCHEMA)', () => {
    const r = parseYaml('a: 2026-09-30\nb: yes\nc: 12\nd: true\n');
    expect(r).toEqual({
      ok: true,
      value: { a: '2026-09-30', b: 'yes', c: 12, d: true },
    });
  });

  it('reports the error line and column', () => {
    const r = parseYaml('plugins:\n  a: [1, 2\n');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.line).toBeGreaterThanOrEqual(1);
      expect(r.error.column).toBeGreaterThanOrEqual(0);
      expect(r.error.message).toBeTruthy();
    }
  });

  it('requires a mapping root; empty is {}', () => {
    expect(parseYaml('- a\n- b\n')).toMatchObject({
      ok: false,
      error: { message: 'Overlay must be a mapping' },
    });
    expect(parseYaml('')).toEqual({ ok: true, value: {} });
    expect(parseYaml('# only a comment\n')).toEqual({ ok: true, value: {} });
  });

  it('dumps multi-line strings as block scalars and keeps key order', () => {
    const text = toYaml({
      z: 1,
      policy_data: { motd: 'line one\n\nline two\n' },
    });
    expect(text).toContain('policy_data:');
    expect(text).toMatch(/motd: \|/);
    expect(text.indexOf('z:')).toBeLessThan(text.indexOf('policy_data:'));
    expect(parseYaml(text)).toEqual({
      ok: true,
      value: { z: 1, policy_data: { motd: 'line one\n\nline two\n' } },
    });
  });

  it('renders an empty document as {}', () => {
    expect(toYaml({})).toBe('{}\n');
    expect(toYaml(null)).toBe('');
  });
});
