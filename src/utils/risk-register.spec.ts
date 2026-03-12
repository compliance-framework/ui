import { describe, expect, it } from 'vitest';
import type { Risk } from '@/oscal';
import {
  computeRiskSummary,
  filterRisks,
  getRiskComponentIds,
  getRiskControlIds,
  getRiskEvidenceIds,
  sortRisks,
} from './risk-register';

function makeRisk(overrides: Partial<Risk> & Record<string, unknown>): Risk {
  return {
    uuid: 'risk-1',
    title: 'Default risk',
    description: 'Default description',
    statement: 'Default statement',
    status: 'open',
    ...overrides,
  } as Risk;
}

describe('risk-register', () => {
  it('computes summary counts including overdue reviews', () => {
    const now = new Date('2026-03-11T12:00:00.000Z');
    const risks = [
      makeRisk({
        uuid: 'r1',
        status: 'open',
        deadline: '2026-03-01T00:00:00Z',
      }),
      makeRisk({
        uuid: 'r2',
        status: 'risk-accepted',
        deadline: '2026-03-20T00:00:00Z',
      }),
      makeRisk({ uuid: 'r3', status: 'closed' }),
    ];

    const summary = computeRiskSummary(risks, now);

    expect(summary).toEqual({
      total: 3,
      open: 1,
      accepted: 1,
      overdueReviews: 1,
    });
  });

  it('filters by search, status and control/evidence ids', () => {
    const risks = [
      makeRisk({
        uuid: 'r1',
        title: 'Database encryption gap',
        status: 'open',
        relatedControls: [{ controlId: 'AC-2' }],
        relatedEvidence: [{ evidenceId: 'ev-1' }],
      }),
      makeRisk({
        uuid: 'r2',
        title: 'Firewall misconfiguration',
        status: 'risk-accepted',
        relatedControls: [{ controlId: 'SC-7' }],
        relatedEvidence: [{ evidenceId: 'ev-2' }],
      }),
    ];

    const filtered = filterRisks(risks, {
      search: 'database',
      status: 'open',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: 'AC-2',
      evidenceId: 'ev-1',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].uuid).toBe('r1');
  });

  it('sorts risks by review deadline', () => {
    const risks = [
      makeRisk({ uuid: 'r1', deadline: '2026-05-01T00:00:00Z' }),
      makeRisk({ uuid: 'r2', deadline: '2026-03-01T00:00:00Z' }),
      makeRisk({ uuid: 'r3', deadline: '2026-04-01T00:00:00Z' }),
    ];

    const sorted = sortRisks(risks, 'review-deadline', 'asc');
    expect(sorted.map((risk) => risk.uuid)).toEqual(['r2', 'r3', 'r1']);
  });

  it('extracts association ids from multiple field shapes', () => {
    const risk = makeRisk({
      relatedControls: [{ controlId: 'CM-1' }],
      controlLinks: [{ controlId: 'IA-5' }],
      controlIds: ['AC-1'],
      relatedEvidence: [{ evidenceUuid: 'ev-1' }],
      evidence: [{ id: 'ev-2' }],
      componentIds: ['comp-1'],
      relatedComponents: [{ componentUuid: 'comp-2' }],
    });

    expect(getRiskControlIds(risk)).toEqual(['AC-1', 'CM-1', 'IA-5']);
    expect(getRiskEvidenceIds(risk)).toEqual(['ev-1', 'ev-2']);
    expect(getRiskComponentIds(risk)).toEqual(['comp-1', 'comp-2']);
  });
});
