import { describe, expect, it } from 'vitest';
import type {
  ProfileComplianceControl,
  ProfileComplianceProgress,
} from '@/types/compliance';
import { mergeProgress } from '../mergeProgress';

const control = (
  controlId: string,
  computedStatus: string,
  group: 'ac' | 'au',
  implemented = false,
): ProfileComplianceControl => ({
  controlId,
  catalogId: 'cat',
  title: controlId,
  groupId: group,
  groupTitle: group === 'ac' ? 'Access Control' : 'Audit',
  implemented,
  statusCounts: [],
  computedStatus,
});

const progress = (
  id: string,
  controls: ProfileComplianceControl[],
): ProfileComplianceProgress => ({
  scope: { type: 'profile', id, title: id },
  summary: {
    totalControls: controls.length,
    satisfied: 0,
    notSatisfied: 0,
    unknown: 0,
    compliancePercent: 0,
    assessedPercent: 0,
  },
  implementation: {
    implementedControls: 0,
    implementationPercent: 0,
    unimplementedControls: 0,
  },
  groups: [],
  controls,
});

describe('mergeProgress', () => {
  it('returns a single profile as it is, and nothing for none', () => {
    const one = progress('p1', [control('ac-1', 'satisfied', 'ac')]);
    expect(mergeProgress([one])).toBe(one);
    expect(mergeProgress([])).toBeUndefined();
  });

  it('counts a control two profiles share once, and totals the way the API does', () => {
    const merged = mergeProgress([
      progress('p1', [
        control('ac-2', 'satisfied', 'ac', true),
        control('au-6', 'not-satisfied', 'au'),
      ]),
      progress('p2', [
        control('ac-2', 'satisfied', 'ac', true),
        control('ac-17', 'inherited', 'ac', true),
        control('ac-6', 'unknown', 'ac'),
      ]),
    ])!;
    expect(merged.controls.map((c) => c.controlId)).toEqual([
      'ac-17',
      'ac-2',
      'ac-6',
      'au-6',
    ]);
    expect(merged.summary).toEqual({
      totalControls: 4,
      satisfied: 1,
      notSatisfied: 1,
      unknown: 1,
      inherited: 1,
      // (satisfied + inherited) / total; assessed adds not satisfied.
      compliancePercent: 50,
      assessedPercent: 75,
      implementedControls: 2,
    });
    expect(merged.implementation).toEqual({
      implementedControls: 2,
      implementationPercent: 50,
      unimplementedControls: 2,
    });
    expect(merged.groups).toEqual([
      expect.objectContaining({
        id: 'ac',
        totalControls: 3,
        satisfied: 1,
        inherited: 1,
        unknown: 1,
        compliancePercent: 67,
      }),
      expect.objectContaining({
        id: 'au',
        totalControls: 1,
        notSatisfied: 1,
        compliancePercent: 0,
      }),
    ]);
  });
});
