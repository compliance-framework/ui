import { describe, expect, it } from 'vitest';
import { diffConfigs } from '../config-diff';

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
      { policy_bundles: { b: { modules: { 'd/x.rego': 'package a\n' } } } },
      { policy_bundles: { b: { modules: { 'd/x.rego': 'package b\n' } } } },
    );
    expect(d).toEqual([
      {
        path: '/policy_bundles/b/modules/d~1x.rego',
        kind: 'changed',
        before: 'package a\n',
        after: 'package b\n',
        multiline: true,
      },
    ]);
  });

  it('returns nothing for equal documents', () => {
    expect(diffConfigs({ a: { b: [1] } }, { a: { b: [1] } })).toEqual([]);
    expect(diffConfigs(null, {})).toEqual([]);
  });
});
