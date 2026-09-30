import { describe, expect, it } from 'vitest';
import { StringStream } from '@codemirror/language';
import { regoParser, type RegoState } from '../languages/rego';

function tokenize(src: string): [string, string | null][] {
  const state: RegoState = regoParser.startState!(2);
  const out: [string, string | null][] = [];
  for (const line of src.split('\n')) {
    const stream = new StringStream(line, 2, 2);
    while (!stream.eol()) {
      const style = regoParser.token(stream, state);
      const text = stream.current();
      if (text.trim()) out.push([text, style]);
      stream.start = stream.pos;
    }
  }
  return out;
}

const MODULE = `package compliance_framework.ssh
import rego.v1
# a comment
max_tries := 3
violation contains msg if {
  every x in input.items { x.enabled }
  msg := sprintf("bad %v", [data.max])
}
raw := \`multi
line\`
`;

describe('rego stream parser', () => {
  const tokens = tokenize(MODULE);
  const styleOf = (text: string) => tokens.find(([t]) => t === text)?.[1];

  it('tokenises keywords, imports and comments', () => {
    expect(styleOf('package')).toBe('keyword');
    expect(styleOf('import')).toBe('keyword');
    expect(styleOf('# a comment')).toBe('comment');
    expect(styleOf('contains')).toBe('keyword');
    expect(styleOf('if')).toBe('keyword');
    expect(styleOf('every')).toBe('keyword');
    expect(styleOf('in')).toBe('keyword');
  });

  it('marks rule heads, :=, numbers, calls and specials', () => {
    expect(styleOf('max_tries')).toBe('def');
    expect(styleOf(':=')).toBe('operator');
    expect(styleOf('3')).toBe('number');
    expect(styleOf('sprintf')).toBe('builtin');
    expect(styleOf('input')).toBe('variable-2');
    expect(styleOf('data')).toBe('variable-2');
    expect(styleOf('violation')).toBe('def');
    expect(styleOf('x')).toBe('variable');
  });

  it('handles double-quoted and multi-line raw strings', () => {
    expect(styleOf('"bad %v"')).toBe('string');
    expect(styleOf('`multi')).toBe('string');
    expect(styleOf('line`')).toBe('string');
  });

  it('uses legacy token names the stream parser maps to highlight tags', () => {
    const legacy = new Set(tokens.map(([, s]) => s));
    for (const s of legacy) {
      expect([
        null,
        'keyword',
        'comment',
        'def',
        'operator',
        'number',
        'builtin',
        'variable-2',
        'variable',
        'string',
        'punctuation',
        'atom',
      ]).toContain(s);
    }
  });
});
