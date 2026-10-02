import { describe, expect, it } from 'vitest';
import { changedLeafPaths, diffConfigs } from '../config-diff';

describe('diffConfigs', () => {
  it('recurses into objects and compares arrays and strings whole', () => {
    const before = {
      verbosity: 0,
      plugins: { a: { policies: ['x'], schedule: 's', gone: 1 } },
    };
    const after = {
      verbosity: 1,
      plugins: { a: { policies: ['x', 'y'], schedule: 's' }, b: {} },
    };
    expect(diffConfigs(before, after)).toEqual([
      { path: '/plugins/a/gone', kind: 'removed', before: 1 },
      {
        path: '/plugins/a/policies',
        kind: 'changed',
        before: ['x'],
        after: ['x', 'y'],
      },
      { path: '/plugins/b', kind: 'added', after: {} },
      { path: '/verbosity', kind: 'changed', before: 0, after: 1 },
    ]);
  });

  it('flags multi-line strings and escapes pointer tokens', () => {
    const d = diffConfigs(
      { plugins: { p: { policy_data: { 'd/x': 'line a\n' } } } },
      { plugins: { p: { policy_data: { 'd/x': 'line b\n' } } } },
    );
    expect(d).toEqual([
      {
        path: '/plugins/p/policy_data/d~1x',
        kind: 'changed',
        before: 'line a\n',
        after: 'line b\n',
        multiline: true,
      },
    ]);
  });

  it('returns nothing for equal documents', () => {
    expect(diffConfigs({ a: { b: [1] } }, { a: { b: [1] } })).toEqual([]);
    expect(diffConfigs(null, {})).toEqual([]);
  });
});

describe('formatRelative', () => {
  it('formats past and future times', async () => {
    const { formatRelative } = await import('../display');
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(formatRelative('2026-09-30T10:00:00Z', now)).toMatch(/2 hours ago/);
    expect(formatRelative('2026-10-03T12:00:00Z', now)).toMatch(/in 3 days/);
    expect(formatRelative('2026-09-30T12:00:20Z', now)).toMatch(
      /this minute|now|0 minutes/,
    );
    expect(formatRelative(null)).toBe('');
    expect(formatRelative('garbage')).toBe('');
  });
});

describe('changedLeafPaths', () => {
  it('lists differing leaves (arrays whole)', () => {
    expect(
      changedLeafPaths(
        { verbosity: 1, plugins: { a: { policies: ['x'] } } },
        { plugins: { a: { policies: ['x', 'y'] }, b: { source: 's' } } },
      ),
    ).toEqual(['/plugins/a/policies', '/plugins/b/source', '/verbosity']);
  });
});

describe('element-level array changes', () => {
  it('pairs a replaced item, and keeps insertions / removals from shifting the rest', async () => {
    const { arrayElementChanges } = await import('../config-diff');
    expect(arrayElementChanges(['a', 'b', 'c'], ['a', 'B', 'c'])).toEqual([
      {
        kind: 'changed',
        beforeIndex: 1,
        afterIndex: 1,
        before: 'b',
        after: 'B',
      },
    ]);
    expect(arrayElementChanges(['a', 'b', 'c'], ['x', 'a', 'b', 'c'])).toEqual([
      { kind: 'added', afterIndex: 0, after: 'x' },
    ]);
    expect(arrayElementChanges(['a', 'b', 'c'], ['a', 'c'])).toEqual([
      { kind: 'removed', beforeIndex: 1, afterIndex: 1, before: 'b' },
    ]);
    expect(arrayElementChanges([{ k: 1 }], [{ k: 1 }])).toEqual([]);
    expect(arrayElementChanges([], [1, 2])).toHaveLength(2);
  });

  it('diffConfigs expands policy_data arrays only', () => {
    const before = {
      plugins: {
        p: { policies: ['x'], policy_data: { users: ['a', 'b', 'c'] } },
      },
    };
    const after = {
      plugins: {
        p: { policies: ['x', 'y'], policy_data: { users: ['a', 'B', 'c'] } },
      },
    };
    expect(diffConfigs(before, after)).toEqual([
      {
        path: '/plugins/p/policies',
        kind: 'changed',
        before: ['x'],
        after: ['x', 'y'],
      },
      {
        path: '/plugins/p/policy_data/users/1',
        kind: 'changed',
        before: 'b',
        after: 'B',
      },
    ]);
    // The underlying documents are untouched; a caller can opt out.
    expect(diffConfigs(before, after, () => false)[1].path).toBe(
      '/plugins/p/policy_data/users',
    );
  });
});
