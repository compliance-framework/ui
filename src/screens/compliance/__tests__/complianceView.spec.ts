import { describe, expect, it } from 'vitest';
import type { ProfileComplianceControl } from '@/types/compliance';
import {
  controlStatus,
  evidenceSegments,
  filterControls,
  leverageLabel,
  readView,
  viewQuery,
} from '../complianceView';

const control = (
  controlId: string,
  computedStatus: string,
  title = controlId,
): ProfileComplianceControl => ({
  controlId,
  catalogId: 'cat',
  title,
  groupTitle: 'Access',
  computedStatus,
  statusCounts: [
    { status: 'satisfied', count: 2 },
    { status: 'incomplete', count: 1 },
    { status: 'unknown', count: 1 },
  ],
});

describe('complianceView', () => {
  it('reads and writes the URL, dropping defaults and unknown statuses', () => {
    expect(readView({ status: 'bogus' })).toEqual({
      profile: '',
      status: '',
      q: '',
    });
    const view = readView({ profile: 'p1', status: 'inherited', q: ' ac ' });
    expect(viewQuery(view)).toEqual({
      profile: 'p1',
      status: 'inherited',
      q: 'ac',
    });
  });

  it('treats unrecognised control statuses as unknown', () => {
    expect(controlStatus(control('ac-1', 'weird'))).toBe('unknown');
  });

  it('filters by status and by id, title or group', () => {
    const controls = [
      control('ac-1', 'satisfied', 'Policy'),
      control('ac-2', 'not-satisfied', 'Accounts'),
    ];
    expect(
      filterControls(controls, {
        profile: '',
        status: 'not-satisfied',
        q: '',
      }).map((c) => c.controlId),
    ).toEqual(['ac-2']);
    expect(
      filterControls(controls, { profile: '', status: '', q: 'policy' }).map(
        (c) => c.controlId,
      ),
    ).toEqual(['ac-1']);
  });

  it('counts incomplete evidence as unknown', () => {
    expect(evidenceSegments(control('ac-1', 'satisfied'))).toEqual([
      { status: 'satisfied', count: 2 },
      { status: 'not-satisfied', count: 0 },
      { status: 'unknown', count: 2 },
    ]);
  });

  it('names how an inherited control stands', () => {
    const leverage = {
      inherited: true,
      satisfaction: 'full' as const,
      status: 'drifted' as const,
      links: 1,
      outstandingCount: 0,
      totalResponsibilities: 1,
      inheritedFrom: [],
    };
    expect(leverageLabel(leverage)).toBe('Inherited · drifted');
    expect(leverageLabel({ ...leverage, status: 'active' })).toBe('Inherited');
  });
});
