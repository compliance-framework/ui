import { describe, expect, it } from 'vitest';
import {
  containsMask,
  envRefs,
  envSegments,
  getIn,
  isMasked,
  itemType,
  jsonType,
  parseNewValue,
  parseScalar,
  removeIn,
  setIn,
  startsCollapsed,
} from '../policy-data';

describe('policy-data helpers', () => {
  it('jsonType names every JSON type', () => {
    expect(['s', 1, true, null, {}, []].map(jsonType)).toEqual([
      'string',
      'number',
      'boolean',
      'null',
      'object',
      'array',
    ]);
  });

  it('setIn / removeIn keep keys verbatim and never mutate', () => {
    const root = {
      MaxTries: 3,
      'kebab-key': { snake_key: [1, 2, 3] },
      'a/b~c': 'x',
    };
    const frozen = JSON.stringify(root);
    const a = setIn(root, ['kebab-key', 'snake_key', 1], 20);
    expect(a['kebab-key'].snake_key).toEqual([1, 20, 3]);
    const b = setIn(a, ['camelCase', 'Deep'], true);
    expect(Object.keys(b)).toEqual([
      'MaxTries',
      'kebab-key',
      'a/b~c',
      'camelCase',
    ]);
    expect(getIn(b, ['camelCase', 'Deep'])).toBe(true);
    // Appending to an array: index = length.
    expect(
      getIn(setIn(b, ['kebab-key', 'snake_key', 3], 4), [
        'kebab-key',
        'snake_key',
      ]),
    ).toEqual([1, 20, 3, 4]);
    expect(removeIn(b, ['kebab-key', 'snake_key', 0])['kebab-key']).toEqual({
      snake_key: [20, 3],
    });
    // Pointer tokens are strings: array indices still work.
    expect(removeIn([1, 2, 3], ['1'])).toEqual([1, 3]);
    expect(setIn([1, { a: 1 }], ['1', 'a'], 2)).toEqual([1, { a: 2 }]);
    expect('a/b~c' in removeIn(b, ['a/b~c'])).toBe(false);
    expect(JSON.stringify(root)).toBe(frozen);

    // "__proto__" is an ordinary key, never the prototype.
    const proto = setIn({}, ['__proto__'], { polluted: true });
    expect(Object.prototype.hasOwnProperty.call(proto, '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('parseNewValue: the container type, else a JSON literal, else text', () => {
    expect(parseNewValue('5', null)).toEqual({ value: 5, error: '' });
    expect(parseNewValue('[]', null).value).toEqual([]);
    expect(parseNewValue('"5"', null).value).toBe('5');
    expect(parseNewValue('hello world', null).value).toBe('hello world');
    expect(parseNewValue('5', 'string').value).toBe('5');
    expect(parseNewValue('x', 'number').error).toBe('Enter a number');
    expect(parseNewValue('0x10', 'number').error).toBe('Enter a number');
    expect(itemType(['a', 'b'])).toBe('string');
    expect(itemType([1, 'b'])).toBeNull();
    expect(itemType([{}])).toBeNull();
    expect(itemType([])).toBeNull();
  });

  it('parseNewValue rejects JSON numbers that would not be stored as typed', () => {
    for (const t of [
      '1e999',
      '-1e999',
      '12345678901234567890',
      '[1, 1e999]',
      '{"a": {"b": 12345678901234567890}}',
    ]) {
      expect(parseNewValue(t, null)).toEqual({
        value: undefined,
        error: 'Number too large; quote it to keep it as a string',
      });
    }
    expect(parseNewValue('"12345678901234567890"', null).value).toBe(
      '12345678901234567890',
    );
    expect(parseNewValue('[1.5, -9007199254740991]', null).value).toEqual([
      1.5, -9007199254740991,
    ]);
  });

  it('parseScalar validates numbers and booleans, keeps strings verbatim', () => {
    expect(parseScalar(' 4.5 ', 'number')).toEqual({ value: 4.5, error: '' });
    expect(parseScalar('', 'number').error).toBe('Enter a number');
    expect(parseScalar('-1.5e3', 'number').value).toBe(-1500);
    // JSON number grammar only: Number() would accept these.
    for (const t of [
      '0x10',
      '0b11',
      '0o7',
      '.5',
      '5.',
      '+1',
      '01',
      'Infinity',
    ]) {
      expect(parseScalar(t, 'number').error).toBe('Enter a number');
    }
    // Not stored as typed: Infinity, or an integer beyond 2^53.
    expect(parseScalar('1e999', 'number').error).toBe('Number too large');
    expect(parseScalar('12345678901234567890', 'number').error).toBe(
      'Number too large',
    );
    expect(parseScalar('9007199254740991', 'number').value).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(parseScalar('false', 'boolean')).toEqual({
      value: false,
      error: '',
    });
    expect(parseScalar('  spaced  ', 'string').value).toBe('  spaced  ');
    expect(parseScalar('', 'object').value).toEqual({});
  });

  it('recognises masked values and ${env:} references', () => {
    expect(isMasked('••••')).toBe(true);
    expect(isMasked('x')).toBe(false);
    expect(containsMask(['a', { b: ['••••'] }])).toBe(true);
    expect(containsMask({ a: ['x', 1, null, true] })).toBe(false);
    expect(envRefs('a ${env:HOME} b ${env:_X1}')).toEqual(['HOME', '_X1']);
    expect(envSegments('pre ${env:A} post')).toEqual([
      { text: 'pre ', env: false },
      { text: '${env:A}', env: true },
      { text: ' post', env: false },
    ]);
    expect(envSegments('${env:1BAD}')).toEqual([
      { text: '${env:1BAD}', env: false },
    ]);
  });

  it('collapses deep or large containers', () => {
    expect(startsCollapsed(0, { a: 1 })).toBe(false);
    expect(startsCollapsed(2, { a: 1 })).toBe(true);
    expect(
      startsCollapsed(
        0,
        Array.from({ length: 21 }, (_, i) => i),
      ),
    ).toBe(true);
  });
});
