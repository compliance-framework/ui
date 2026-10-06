import { describe, expect, it } from 'vitest';
import { toDiagnostics } from '../diagnostics';

const doc = 'package a\n\nallow if true\n';

describe('toDiagnostics', () => {
  it('maps 1-based row/col to a range ending at the end of the line', () => {
    expect(toDiagnostics(doc, [{ row: 3, col: 7, message: 'm' }])).toEqual([
      { from: 17, to: 24, message: 'm', severity: 'error' },
    ]);
  });

  it('clamps rows and columns into the document', () => {
    const [low] = toDiagnostics(doc, [
      { row: 0, col: -5, message: 'm', severity: 'warning' },
    ]);
    expect(low).toEqual({ from: 0, to: 9, message: 'm', severity: 'warning' });
    const [high] = toDiagnostics(doc, [{ row: 99, col: 99, message: 'm' }]);
    // Last line is empty (trailing newline): a zero-length range at the end.
    expect(high.from).toBe(doc.length);
    expect(high.to).toBe(doc.length);
    const [colPastEnd] = toDiagnostics(doc, [
      { row: 1, col: 500, message: 'm' },
    ]);
    expect(colPastEnd).toMatchObject({ from: 9, to: 9 });
  });

  it('defaults the column to 1', () => {
    expect(toDiagnostics('x\ny', [{ row: 2, message: 'm' }])[0]).toMatchObject({
      from: 2,
      to: 3,
    });
  });
});
