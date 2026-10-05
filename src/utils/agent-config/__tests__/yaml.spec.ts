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

  it('rejects aliases of mappings and sequences without expanding them', () => {
    // 9 levels × 10 aliases: about 10^9 nodes once expanded.
    const lines = ['a0: &a0 [x, x, x, x, x, x, x, x, x, x]'];
    for (let i = 1; i <= 9; i++) {
      const refs = Array.from({ length: 10 }, () => `*a${i - 1}`).join(', ');
      lines.push(`a${i}: &a${i} [${refs}]`);
    }
    const started = Date.now();
    expect(parseYaml(lines.join('\n'))).toEqual({
      ok: false,
      error: { message: 'YAML aliases are not supported', line: 0, column: 0 },
    });
    expect(Date.now() - started).toBeLessThan(1000);

    expect(parseYaml('a: &x {k: 1}\nb: *x\n')).toMatchObject({
      ok: false,
      error: { message: 'YAML aliases are not supported' },
    });
    // An anchor without an alias, and an alias of a scalar (a copy), are harmless.
    expect(parseYaml('a: &x {k: 1}\nb: &y 2\nc: *y\n')).toEqual({
      ok: true,
      value: { a: { k: 1 }, b: 2, c: 2 },
    });
  });

  it('rejects << merge keys', () => {
    for (const text of [
      'base: &b {k: 1}\nplugins:\n  p:\n    <<: *b\n',
      'plugins:\n  p:\n    <<: {k: 1}\n',
    ]) {
      expect(parseYaml(text)).toMatchObject({
        ok: false,
        error: { message: 'YAML merge keys (<<) are not supported' },
      });
    }
  });

  it('rejects documents with too many values', () => {
    const text = `a: [${Array.from({ length: 100_001 }, () => '1').join(',')}]`;
    expect(parseYaml(text)).toMatchObject({
      ok: false,
      error: { message: 'Document is too large' },
    });
  });

  it('renders an empty document as {}', () => {
    expect(toYaml({})).toBe('{}\n');
    expect(toYaml(null)).toBe('');
  });
});
