import { describe, expect, it } from 'vitest';
import {
  computeComplianceWidths,
  controlKey,
  percent,
  statusClass,
  statusCount,
  statusLabel,
} from './compliance';

describe('compliance utils', () => {
  it('computes widths from summary values', () => {
    expect(
      computeComplianceWidths({
        totalControls: 3,
        satisfied: 1,
        notSatisfied: 1,
      }),
    ).toEqual({
      satisfied: 33,
      notSatisfied: 33,
      unknown: 34,
    });
  });

  it('returns zero widths when summary is missing', () => {
    expect(computeComplianceWidths()).toEqual({
      satisfied: 0,
      notSatisfied: 0,
      unknown: 0,
    });
  });

  it('caps not-satisfied width to remaining percentage', () => {
    expect(
      computeComplianceWidths({
        totalControls: 1,
        satisfied: 1,
        notSatisfied: 1,
      }),
    ).toEqual({
      satisfied: 100,
      notSatisfied: 0,
      unknown: 0,
    });
  });

  it('computes percentages safely when total is zero', () => {
    expect(percent(3, 0)).toBe(0);
  });

  it('builds a stable control key', () => {
    expect(
      controlKey({
        controlId: 'AC-1',
        catalogId: 'NIST-800-53',
        title: 'Access Control Policy and Procedures',
        statusCounts: [],
        computedStatus: 'unknown',
      }),
    ).toBe('NIST-800-53:AC-1');
  });

  it('returns matching status count or zero fallback', () => {
    const control = {
      controlId: 'AC-2',
      catalogId: 'NIST-800-53',
      title: 'Account Management',
      statusCounts: [
        { status: 'satisfied', count: 2 },
        { status: 'not-satisfied', count: 1 },
      ],
      computedStatus: 'satisfied',
    };

    expect(statusCount(control, 'satisfied')).toBe(2);
    expect(statusCount(control, 'unknown')).toBe(0);
  });

  it('maps status display classes and labels', () => {
    expect(statusClass('satisfied')).toBe('bg-emerald-100 text-emerald-800');
    expect(statusClass('not-satisfied')).toBe('bg-red-100 text-red-800');
    expect(statusClass('anything-else')).toBe('bg-slate-100 text-slate-800');

    expect(statusLabel('satisfied')).toBe('Satisfied');
    expect(statusLabel('not-satisfied')).toBe('Not Satisfied');
    expect(statusLabel('anything-else')).toBe('Unknown');
  });
});
