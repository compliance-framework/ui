import { describe, expect, it } from 'vitest';
import {
  configKeyOverridable,
  goPathMatch,
  pathMatch,
  sourceTrusted,
} from '../glob';

// Go src/path/match_test.go vectors: [pattern, name, match, badPattern].
const goVectors: [string, string, boolean, boolean][] = [
  ['abc', 'abc', true, false],
  ['*', 'abc', true, false],
  ['*c', 'abc', true, false],
  ['a*', 'a', true, false],
  ['a*', 'abc', true, false],
  ['a*', 'ab/c', false, false],
  ['a*/b', 'abc/b', true, false],
  ['a*/b', 'a/c/b', false, false],
  ['a*b*c*d*e*/f', 'axbxcxdxe/f', true, false],
  ['a*b*c*d*e*/f', 'axbxcxdxexxx/f', true, false],
  ['a*b*c*d*e*/f', 'axbxcxdxe/xxx/f', false, false],
  ['a*b*c*d*e*/f', 'axbxcxdxexxx/fff', false, false],
  ['a*b?c*x', 'abxbbxdbxebxczzx', true, false],
  ['a*b?c*x', 'abxbbxdbxebxczzy', false, false],
  ['ab[c]', 'abc', true, false],
  ['ab[b-d]', 'abc', true, false],
  ['ab[e-g]', 'abc', false, false],
  ['ab[^c]', 'abc', false, false],
  ['ab[^b-d]', 'abc', false, false],
  ['ab[^e-g]', 'abc', true, false],
  ['a\\*b', 'a*b', true, false],
  ['a\\*b', 'ab', false, false],
  ['a?b', 'a☺b', true, false],
  ['a[^a]b', 'a☺b', true, false],
  ['a???b', 'a☺b', false, false],
  ['a[^a][^a][^a]b', 'a☺b', false, false],
  ['[a-ζ]*', 'α', true, false],
  ['*[a-ζ]', 'A', false, false],
  ['a?b', 'a/b', false, false],
  ['a*b', 'a/b', false, false],
  ['[\\]a]', ']', true, false],
  ['[\\-]', '-', true, false],
  ['[x\\-]', 'x', true, false],
  ['[x\\-]', '-', true, false],
  ['[x\\-]', 'z', false, false],
  ['[\\-x]', 'x', true, false],
  ['[\\-x]', '-', true, false],
  ['[\\-x]', 'a', false, false],
  ['[]a]', ']', false, true],
  ['[-]', '-', false, true],
  ['[x-]', 'x', false, true],
  ['[x-]', '-', false, true],
  ['[x-]', 'z', false, true],
  ['[-x]', 'x', false, true],
  ['[-x]', '-', false, true],
  ['[-x]', 'a', false, true],
  ['\\', 'a', false, true],
  ['[a-b-c]', 'a', false, true],
  ['[', 'a', false, true],
  ['[^', 'a', false, true],
  ['[^bc', 'a', false, true],
  ['a[', 'a', false, true],
  ['a[', 'ab', false, true],
  ['a[', 'x', false, true],
  ['a/b[', 'x', false, true],
  ['*x', 'xxx', true, false],
];

describe('goPathMatch (Go path.Match vectors)', () => {
  it.each(goVectors)(
    'Match(%j, %j) = %s (bad pattern: %s)',
    (pattern, name, match, bad) => {
      expect(goPathMatch(pattern, name)).toEqual({
        matched: match,
        error: bad,
      });
      expect(pathMatch(pattern, name)).toBe(match);
    },
  );
});

describe('configKeyOverridable', () => {
  it.each([
    [['timeout'], 'local-ssh', 'timeout', true],
    [['local-ssh:port'], 'local-ssh', 'port', true],
    [['local-ssh:port'], 'other', 'port', false],
    [['local-*:p*'], 'local-ssh', 'port', true],
    [['*'], 'any', 'key', true],
    [['a:b:c'], 'a', 'b:c', true], // splits on the FIRST ':'
    [['Port'], 'p', 'port', false], // case-sensitive (R28)
    [[], 'p', 'port', false],
    [['[bad'], 'p', 'port', false],
  ])('%j plugin=%s key=%s → %s', (flags, plugin, key, expected) => {
    expect(configKeyOverridable(flags, plugin, key)).toBe(expected);
  });
});

describe('sourceTrusted', () => {
  it('matches with path.Match semantics', () => {
    const globs = ['ghcr.io/compliance-framework/*'];
    expect(sourceTrusted(globs, 'ghcr.io/compliance-framework/plugin:v1')).toBe(
      true,
    );
    expect(
      sourceTrusted(globs, 'ghcr.io/compliance-framework/sub/plugin:v1'),
    ).toBe(false);
    expect(sourceTrusted(globs, 'docker.io/evil/plugin')).toBe(false);
  });
});
