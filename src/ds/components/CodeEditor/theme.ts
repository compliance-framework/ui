// CodeMirror theme from the design tokens. The tokens switch with the colour scheme, so one theme
// serves light and dark and the editor never has to be reconfigured when the theme changes.

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

const baseTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--ds-color-surface-raised)',
    color: 'var(--ds-color-text-primary)',
    fontSize: 'var(--ds-font-size-body)',
  },
  '.cm-content': {
    caretColor: 'var(--ds-color-text-primary)',
    fontFamily: 'var(--ds-font-code)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--ds-color-text-primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--ds-color-surface-sunken)',
    color: 'var(--ds-color-text-secondary)',
    borderRight: 'var(--ds-border-width) solid var(--ds-color-border-subtle)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--ds-color-surface-hover)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--ds-color-surface-hover)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--ds-color-surface-selected)' },
  '&.cm-focused': {
    outline: 'var(--ds-focus-width) solid var(--ds-color-border-focus)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--ds-color-surface-sunken)',
    color: 'var(--ds-color-text-primary)',
  },
});

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--ds-color-text-accent)' },
  { tag: [t.atom, t.bool, t.null], color: 'var(--ds-color-status-warning-fg)' },
  { tag: t.number, color: 'var(--ds-color-status-info-fg)' },
  { tag: t.string, color: 'var(--ds-color-status-success-fg)' },
  {
    tag: t.comment,
    color: 'var(--ds-color-text-secondary)',
    fontStyle: 'italic',
  },
  { tag: t.operator, color: 'var(--ds-color-text-secondary)' },
  {
    tag: t.definition(t.variableName),
    color: 'var(--ds-color-text-accent)',
    fontWeight: 'var(--ds-font-weight-semibold)',
  },
  {
    tag: [t.propertyName, t.attributeName],
    color: 'var(--ds-color-text-accent)',
  },
  { tag: t.invalid, color: 'var(--ds-color-status-error-fg)' },
]);

/** The editor's colours and type, from the design tokens. */
export const editorTheme: Extension = [
  baseTheme,
  syntaxHighlighting(highlight),
];

/**
 * Layout shared by every editor. The host element carries min/max height (so prop changes
 * apply without a new theme); the editor inherits them and scrolls inside.
 */
export const layoutTheme = EditorView.theme({
  '&': { minHeight: 'inherit', maxHeight: 'inherit' },
  '.cm-scroller': { overflow: 'auto' },
});
