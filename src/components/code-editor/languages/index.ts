import type { Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/lang-yaml';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { regoParser } from './rego';

export type EditorLanguage = 'yaml' | 'json' | 'rego' | 'text';

const rego = StreamLanguage.define(regoParser);

export function languageExtension(
  language: EditorLanguage,
  lint = true,
): Extension {
  switch (language) {
    case 'yaml':
      return yaml();
    case 'json':
      return lint ? [json(), linter(jsonParseLinter())] : json();
    case 'rego':
      return rego;
    default:
      return [];
  }
}
