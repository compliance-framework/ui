// A small Rego StreamLanguage grammar (LLD U4.5): keywords, package/import, strings (incl.
// raw backtick strings), comments, operators, rule heads and calls. Legacy token names map to
// highlight tags through @codemirror/language's stream-parser default table:
// variable-2 → variableName.special, def → variableName.definition, builtin →
// variableName.standard.

import type { StreamParser } from '@codemirror/language';

const KEYWORDS = new Set([
  'package',
  'import',
  'as',
  'default',
  'else',
  'not',
  'with',
  'some',
  'every',
  'in',
  'if',
  'contains',
]);
const ATOMS = new Set(['true', 'false', 'null']);
const SPECIAL = new Set(['input', 'data']);

export interface RegoState {
  inRaw: boolean;
}

export const regoParser: StreamParser<RegoState> = {
  name: 'rego',
  startState: () => ({ inRaw: false }),
  copyState: (s) => ({ inRaw: s.inRaw }),
  token(stream, state) {
    if (state.inRaw) {
      while (!stream.eol()) {
        if (stream.next() === '`') {
          state.inRaw = false;
          break;
        }
      }
      return 'string';
    }
    if (stream.eatSpace()) return null;
    const ch = stream.peek();
    if (ch === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    if (ch === '"') {
      stream.next();
      let escaped = false;
      let c: string | void;
      while ((c = stream.next()) != null) {
        if (c === '"' && !escaped) break;
        escaped = !escaped && c === '\\';
      }
      return 'string';
    }
    if (ch === '`') {
      stream.next();
      state.inRaw = true;
      while (!stream.eol()) {
        if (stream.next() === '`') {
          state.inRaw = false;
          break;
        }
      }
      return 'string';
    }
    if (stream.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/)) return 'number';
    if (stream.match(/^(:=|==|!=|<=|>=|[=<>|&+\-*/%])/)) return 'operator';
    const atLineStart = stream.column() === 0;
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
      const w = stream.current();
      if (KEYWORDS.has(w)) return 'keyword';
      if (ATOMS.has(w)) return 'atom';
      if (SPECIAL.has(w)) return 'variable-2';
      if (atLineStart) return 'def';
      if (stream.match(/^\s*\(/, false)) return 'builtin';
      return 'variable';
    }
    if (stream.match(/^[[\]{}().,;:]/)) return 'punctuation';
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: '#' } },
};
