// Pure conversion of row/col problems (API PolicyError rows, YAML parse errors) into
// CodeMirror lint diagnostics. Rows and columns are 1-based; they are clamped to the
// document, and a diagnostic runs from its column to the end of its line.

import { Text } from '@codemirror/state';
import type { Diagnostic } from '@codemirror/lint';

export interface EditorDiagnostic {
  /** 1-based. */
  row: number;
  /** 1-based; defaults to 1. */
  col?: number;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

export function toDiagnostics(
  doc: Text | string,
  diags: readonly EditorDiagnostic[],
): Diagnostic[] {
  const text = typeof doc === 'string' ? Text.of(doc.split('\n')) : doc;
  return diags.map((d) => {
    const row = Math.min(Math.max(1, Math.floor(d.row || 1)), text.lines);
    const line = text.line(row);
    const col = Math.min(Math.max(1, Math.floor(d.col || 1)), line.length + 1);
    const from = line.from + col - 1;
    const to = Math.max(from, line.to);
    return { from, to, message: d.message, severity: d.severity ?? 'error' };
  });
}
