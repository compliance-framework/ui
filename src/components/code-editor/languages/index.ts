import type { Extension } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';

export type EditorLanguage = 'yaml' | 'json' | 'text';

export function languageExtension(
  language: EditorLanguage,
  lint = true,
): Extension {
  switch (language) {
    case 'yaml':
      return yaml();
    case 'json':
      return lint ? [json(), linter(jsonParseLinter())] : json();
    default:
      return [];
  }
}
