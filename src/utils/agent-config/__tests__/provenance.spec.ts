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

  it('plugin provenance', () => {
    expect(
      pluginProvenance('a', base, { plugins: { a: { schedule: 'y' } } }),
    ).toBe('overrides-file');
    expect(pluginProvenance('a', base, {})).toBe('file');
  });
});
