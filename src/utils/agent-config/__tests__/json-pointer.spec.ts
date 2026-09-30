import { describe, expect, it } from 'vitest';
import {
  formatPointer,
  getAt,
  hasAt,
  isPrefix,
  parsePointer,
  pointer,
} from '../json-pointer';

describe('json-pointer', () => {
  it.each([
    ['', []],
    [
      '/plugins/local-ssh/config/port',
      ['plugins', 'local-ssh', 'config', 'port'],
    ],
    [
      '/policy_bundles/b/modules/a~1b.rego',
      ['policy_bundles', 'b', 'modules', 'a/b.rego'],
    ],
    ['/x/~0tilde~1slash', ['x', '~tilde/slash']],
    ['/a/', ['a', '']],
  ])('parses %s', (ptr, tokens) => {
    expect(parsePointer(ptr)).toEqual(tokens);
    expect(formatPointer(tokens)).toBe(ptr);
  });

  it('rejects pointers without a leading slash', () => {
    expect(() => parsePointer('plugins')).toThrow();
  });

  it('pointer() escapes tokens', () => {
    expect(pointer('policy_bundles', 'b', 'modules', 'dir/x.rego')).toBe(
      '/policy_bundles/b/modules/dir~1x.rego',
    );
  });

  const doc = { a: { b: null, c: [10, { d: 1 }] }, e: 0 };
  it.each([
    ['/a/b', null, true],
    ['/a/x', undefined, false],
    ['/a/c/0', 10, true],
    ['/a/c/1/d', 1, true],
    ['/a/c/2', undefined, false],
    ['/a/b/z', undefined, false],
    ['/e', 0, true],
    ['', doc, true],
  ])('getAt/hasAt %s', (ptr, value, present) => {
    expect(getAt(doc, ptr)).toEqual(value);
    expect(hasAt(doc, ptr)).toBe(present);
  });

  it.each([
    ['/plugins/a', '/plugins/a/config', true],
    ['/plugins/a', '/plugins/a', true],
    ['/plugins/a', '/plugins/ab', false],
    ['', '/x', true],
    ['/plugins/a/config', '/plugins/a', false],
  ])('isPrefix(%s, %s)', (a, b, expected) => {
    expect(isPrefix(a, b)).toBe(expected);
  });
});
