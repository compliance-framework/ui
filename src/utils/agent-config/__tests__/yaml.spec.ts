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
      modules: { 'a.rego': 'package a\n\nimport rego.v1\n' },
    });
    expect(text).toContain('modules:');
    expect(text).toMatch(/a\.rego: \|/);
    expect(text.indexOf('z:')).toBeLessThan(text.indexOf('modules:'));
    expect(parseYaml(text)).toEqual({
      ok: true,
      value: { z: 1, modules: { 'a.rego': 'package a\n\nimport rego.v1\n' } },
    });
  });

  it('renders an empty document as {}', () => {
    expect(toYaml({})).toBe('{}\n');
    expect(toYaml(null)).toBe('');
  });
});
