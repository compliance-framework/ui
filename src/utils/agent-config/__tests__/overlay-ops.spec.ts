import { describe, expect, it } from 'vitest';
import { makeAbsent, nullAt, setAt, unsetAt } from '../overlay-ops';

describe('overlay-ops', () => {
  it('setAt creates intermediates and never mutates', () => {
    const o = { plugins: { a: { schedule: 'x' } } };
    const next = setAt(o, '/plugins/a/config/port', '22');
    expect(next).toEqual({
      plugins: { a: { schedule: 'x', config: { port: '22' } } },
    });
    expect(o).toEqual({ plugins: { a: { schedule: 'x' } } });
  });

  it('setAt replaces a null intermediate (un-remove a plugin)', () => {
    const o = { plugins: { a: null } };
    expect(setAt(o, '/plugins/a/enabled', true)).toEqual({
      plugins: { a: { enabled: true } },
    });
  });

  it('unsetAt removes the key and prunes empty parents up to depth 1', () => {
    const o = { verbosity: 1, plugins: { a: { config: { port: '22' } } } };
    expect(unsetAt(o, '/plugins/a/config/port')).toEqual({ verbosity: 1 });
  });

  it('unsetAt keeps non-empty parents and the root', () => {
    expect(
      unsetAt(
        { plugins: { a: { config: { p: '1', q: '2' } } } },
        '/plugins/a/config/p',
      ),
    ).toEqual({ plugins: { a: { config: { q: '2' } } } });
    expect(unsetAt({ verbosity: 1 }, '/verbosity')).toEqual({});
  });

  it('unsetAt of an absent key is a no-op copy', () => {
    const o = { plugins: { a: { schedule: 'x' } } };
    expect(unsetAt(o, '/plugins/b/schedule')).toEqual(o);
  });

  it('nullAt writes an explicit null', () => {
    expect(nullAt({}, '/plugins/a')).toEqual({ plugins: { a: null } });
  });

  it('makeAbsent nulls base keys and omits overlay-only keys', () => {
    const base = { plugins: { a: { schedule: '* * * * *' } } };
    expect(makeAbsent({}, base, '/plugins/a')).toEqual({
      plugins: { a: null },
    });
    expect(
      makeAbsent({ plugins: { b: { source: 's' } } }, base, '/plugins/b'),
    ).toEqual({});
  });
});
