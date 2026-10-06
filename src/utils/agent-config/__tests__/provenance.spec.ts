import { describe, expect, it } from 'vitest';
import { pluginProvenance, provenanceOf } from '../provenance';

const base = {
  verbosity: 0,
  plugins: { a: { schedule: 'x', config: { k: 'v' } } },
};

describe('provenance', () => {
  it.each([
    ['/verbosity', {}, 'file'],
    ['/verbosity', { verbosity: 1 }, 'overrides-file'],
    ['/plugins/b', { plugins: { b: { source: 's' } } }, 'overlay'],
    ['/plugins/a', { plugins: { a: null } }, 'removed-by-overlay'],
    ['/plugins/a/schedule', { plugins: { a: null } }, 'removed-by-overlay'],
    [
      '/plugins/a/config/k',
      { plugins: { a: { config: { k: null } } } },
      'removed-by-overlay',
    ],
    [
      '/plugins/a/config/new',
      { plugins: { a: { config: { new: '1' } } } },
      'overlay',
    ],
    ['/plugins/zzz', { plugins: { zzz: null } }, 'file'],
  ])('%s with %j → %s', (ptr, overlay, expected) => {
    expect(provenanceOf(ptr, base, overlay)).toBe(expected);
  });

  it('treats a null file value as present', () => {
    const b = { policy_data: { k: null } };
    expect(provenanceOf('/policy_data/k', b, { policy_data: { k: 1 } })).toBe(
      'overrides-file',
    );
    expect(
      provenanceOf('/policy_data/k', b, { policy_data: { k: null } }),
    ).toBe('removed-by-overlay');
    expect(provenanceOf('/policy_data/k', b, {})).toBe('file');
  });

  it('classifies descendants of an array or scalar replacement by the replacement', () => {
    const b = { items: [1], objs: [{ x: 1, y: 2 }], m: { a: { b: 1 } } };
    // A null inside a replacing array is data, not a deletion.
    expect(provenanceOf('/items/0', b, { items: [null] })).toBe(
      'overrides-file',
    );
    expect(provenanceOf('/objs/0/x', b, { objs: [{ x: 3 }] })).toBe(
      'overrides-file',
    );
    expect(provenanceOf('/objs/0/y', b, { objs: [{ x: 3 }] })).toBe(
      'removed-by-overlay',
    );
    expect(provenanceOf('/objs/1', b, { objs: [{ x: 3 }, 4] })).toBe('overlay');
    // A scalar replacing an object removes what was below it.
    expect(provenanceOf('/m/a/b', b, { m: 'flat' })).toBe('removed-by-overlay');
    expect(provenanceOf('/m/a/b', b, { m: { a: 7 } })).toBe(
      'removed-by-overlay',
    );
  });

  it('plugin provenance', () => {
    expect(
      pluginProvenance('a', base, { plugins: { a: { schedule: 'y' } } }),
    ).toBe('overrides-file');
    expect(pluginProvenance('a', base, {})).toBe('file');
  });
});
