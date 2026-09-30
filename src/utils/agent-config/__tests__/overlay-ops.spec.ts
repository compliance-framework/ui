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

describe('replacingPatch', () => {
  it('writes target keys in full and nulls keys only in the source', async () => {
    const { replacingPatch } = await import('../overlay-ops');
    const { mergePatch } = await import('../merge-patch');
    const source = { a: 1, b: { c: 2, d: 3 }, e: [1] };
    const target = { a: 1, b: { c: 5 }, f: 'x' };
    const patch = replacingPatch(source, target);
    expect(patch).toEqual({ a: 1, b: { c: 5, d: null }, f: 'x', e: null });
    expect(mergePatch(source, patch)).toEqual(target);
  });
});

describe('replacingPatch and masked values (R25)', () => {
  it('never copies an untouched mask from the redacted source into the patch', async () => {
    const { replacingPatch } = await import('../overlay-ops');
    const source = {
      api_key: '••••',
      nested: { token: '••••', n: 1 },
      keep: 'a',
    };
    const target = {
      api_key: '••••',
      nested: { token: '••••', n: 2 },
      keep: 'b',
    };
    expect(replacingPatch(source, target)).toEqual({
      nested: { n: 2 },
      keep: 'b',
    });
    // A mask the user typed where the source had something else is kept (validation blocks it).
    expect(replacingPatch({ a: 'x' }, { a: '••••' })).toEqual({ a: '••••' });
  });
});

describe('"__proto__" keys are data, never prototypes', () => {
  it('setAt does not pollute Object.prototype and keeps the key', async () => {
    const { setAt } = await import('../overlay-ops');
    const out = setAt(
      { plugins: {} },
      '/plugins/__proto__/config/k',
      'v',
    ) as Record<string, unknown>;
    expect(({} as Record<string, unknown>).config).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(out.plugins, '__proto__')).toBe(
      true,
    );
  });

  it('clone and mergePatch preserve an own "__proto__" key', async () => {
    const { clone, mergePatch } = await import('../merge-patch');
    const doc = JSON.parse('{"policy_data":{"__proto__":{"x":1}}}');
    expect(JSON.stringify(clone(doc))).toBe(
      '{"policy_data":{"__proto__":{"x":1}}}',
    );
    expect(JSON.stringify(mergePatch({}, doc))).toBe(
      '{"policy_data":{"__proto__":{"x":1}}}',
    );
  });
});
