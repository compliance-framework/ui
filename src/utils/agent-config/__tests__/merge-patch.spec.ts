import { describe, expect, it } from 'vitest';
import { clone, deepEqual, mergePatch } from '../merge-patch';

describe('mergePatch (RFC 7396 Appendix A)', () => {
  const cases: [unknown, unknown, unknown][] = [
    [{ a: 'b' }, { a: 'c' }, { a: 'c' }],
    [{ a: 'b' }, { b: 'c' }, { a: 'b', b: 'c' }],
    [{ a: 'b' }, { a: null }, {}],
    [{ a: 'b', b: 'c' }, { a: null }, { b: 'c' }],
    [{ a: ['b'] }, { a: 'c' }, { a: 'c' }],
    [{ a: 'c' }, { a: ['b'] }, { a: ['b'] }],
    [{ a: { b: 'c' } }, { a: { b: 'd', c: null } }, { a: { b: 'd' } }],
    [{ a: [{ b: 'c' }] }, { a: [1] }, { a: [1] }],
    [
      ['a', 'b'],
      ['c', 'd'],
      ['c', 'd'],
    ],
    [{ a: 'b' }, ['c'], ['c']],
    [{ a: 'foo' }, null, null],
    [{ a: 'foo' }, 'bar', 'bar'],
    [{ e: null }, { a: 1 }, { e: null, a: 1 }],
    [[1, 2], { a: 'b', c: null }, { a: 'b' }],
    [{}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }],
  ];

  it.each(cases)('%j + %j', (target, patch, expected) => {
    expect(mergePatch(target, patch)).toEqual(expected);
  });

  it('never mutates its inputs', () => {
    const target = { a: { b: 1 }, c: [1] };
    const patch = { a: { b: null, d: 2 } };
    const t = clone(target);
    const p = clone(patch);
    mergePatch(target, patch);
    expect(target).toEqual(t);
    expect(patch).toEqual(p);
  });
});

describe('deepEqual / clone', () => {
  it('ignores key order but not array order', () => {
    expect(deepEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(deepEqual({ b: [2, 1] }, { b: [1, 2] })).toBe(false);
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it('clones deeply', () => {
    const src = { a: { b: [{ c: 1 }] } };
    const copy = clone(src);
    copy.a.b[0].c = 2;
    expect(src.a.b[0].c).toBe(1);
  });
});
