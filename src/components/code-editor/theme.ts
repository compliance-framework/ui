// CodeMirror themes using the app's Tailwind slate palette, light and dark.

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' },
    '.cm-content': {
      caretColor: '#0f172a',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      borderRight: '1px solid #e2e8f0',
    },
    '.cm-activeLine': { backgroundColor: '#f1f5f9' },
    '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
      {
        backgroundColor: '#bae6fd',
      },
    '&.cm-focused': { outline: '2px solid #38bdf8' },
  },
  { dark: false },
);

const darkTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '13px' },
    '.cm-content': {
      caretColor: '#e2e8f0',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    '.cm-gutters': {
      backgroundColor: '#020617',
      color: '#64748b',
      borderRight: '1px solid #1e293b',
    },
    '.cm-activeLine': { backgroundColor: '#1e293b' },
    '.cm-activeLineGutter': { backgroundColor: '#1e293b' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
      {
        backgroundColor: '#0c4a6e',
      },
    '&.cm-focused': { outline: '2px solid #0ea5e9' },
  },
  { dark: true },
);

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#7c3aed' },
  { tag: [t.atom, t.bool, t.null], color: '#c2410c' },
  { tag: t.number, color: '#0369a1' },
  { tag: t.string, color: '#15803d' },
  { tag: t.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: t.operator, color: '#be123c' },
  { tag: t.definition(t.variableName), color: '#1d4ed8', fontWeight: '600' },
  { tag: t.special(t.variableName), color: '#b45309' },
  { tag: t.standard(t.variableName), color: '#0e7490' },
  { tag: [t.propertyName, t.attributeName], color: '#1d4ed8' },
  { tag: t.invalid, color: '#dc2626' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c4b5fd' },
  { tag: [t.atom, t.bool, t.null], color: '#fdba74' },
  { tag: t.number, color: '#7dd3fc' },
  { tag: t.string, color: '#86efac' },
  { tag: t.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: t.operator, color: '#fda4af' },
  { tag: t.definition(t.variableName), color: '#93c5fd', fontWeight: '600' },
  { tag: t.special(t.variableName), color: '#fcd34d' },
  { tag: t.standard(t.variableName), color: '#67e8f9' },
  { tag: [t.propertyName, t.attributeName], color: '#93c5fd' },
  { tag: t.invalid, color: '#f87171' },
]);

export function editorTheme(dark: boolean): Extension {
  return dark
    ? [darkTheme, syntaxHighlighting(darkHighlight)]
    : [lightTheme, syntaxHighlighting(lightHighlight)];
}

/** Whether the app is in dark mode (useTheme toggles `html.dark`). */
export function isDarkMode(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  );
}
