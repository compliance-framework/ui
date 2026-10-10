import { describe, expect, it } from 'vitest';
import type { Risk } from '@/oscal';
import {
  computeRiskSummary,
  filterRisks,
  formatRiskFilterLevel,
  getRiskComponentIds,
  getRiskControlIds,
  getRiskEvidenceIds,
  getRiskSeverityLevel,
  getRiskSeverityLevelFromScore,
  getRiskSeverityScore,
  isOpenStatus,
  readRiskFiltersFromQuery,
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
      total: 2, // Excludes closed risk
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
      statusCategory: 'all',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: 'AC-2',
      evidenceId: 'ev-1',
      riskId: '',
      createdFrom: '',
      createdTo: '',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].uuid).toBe('r1');
  });

  it('filters not-closed excludes all closed statuses', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'open' }),
      makeRisk({ uuid: 'r2', status: 'investigating' }),
      makeRisk({ uuid: 'r3', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r4', status: 'closed' }),
      makeRisk({ uuid: 'r5', status: 'resolved' }),
      makeRisk({ uuid: 'r6', status: 'complete' }),
    ];

    const filtered = filterRisks(risks, {
      search: '',
      status: 'not-closed',
      statusCategory: 'all',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: '',
      createdFrom: '',
      createdTo: '',
    });

    expect(filtered).toHaveLength(3);
    expect(filtered.map((r) => r.uuid)).toEqual(['r1', 'r2', 'r3']);
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

  it('filters by risk id, created range, and accepted status category', () => {
    const risks = [
      makeRisk({
        uuid: 'r1',
        status: 'open',
        createdAt: '2026-03-01T10:00:00Z',
      }),
      makeRisk({
        uuid: 'r2',
        status: 'risk-accepted',
        createdAt: '2026-03-05T10:00:00Z',
      }),
      makeRisk({
        uuid: 'r3',
        status: 'risk-accepted',
        createdAt: '2026-01-05T10:00:00Z',
      }),
    ];

    const acceptedInRange = filterRisks(risks, {
      search: '',
      status: 'all',
      statusCategory: 'accepted',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: '',
      createdFrom: '2026-03-01T00:00:00Z',
      createdTo: '2026-03-31T23:59:59Z',
    });

    expect(acceptedInRange.map((risk) => risk.uuid)).toEqual(['r2']);

    const specificRisk = filterRisks(risks, {
      search: '',
      status: 'all',
      statusCategory: 'all',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: 'r1',
      createdFrom: '',
      createdTo: '',
    });

    expect(specificRisk.map((risk) => risk.uuid)).toEqual(['r1']);
  });

  it('treats accepted and risk-accepted as equivalent in status filter', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'accepted' }),
      makeRisk({ uuid: 'r2', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r3', status: 'open' }),
    ];

    const filtered = filterRisks(risks, {
      search: '',
      status: 'risk-accepted',
      statusCategory: 'all',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: '',
      createdFrom: '',
      createdTo: '',
    });

    expect(filtered.map((risk) => risk.uuid)).toEqual(['r1', 'r2']);
  });

  it('supports unknown status filter for risks without a canonical status', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'open' }),
      makeRisk({ uuid: 'r2', status: '' as unknown as string }),
      makeRisk({ uuid: 'r3', status: 'unknown' }),
      makeRisk({ uuid: 'r4', status: undefined as unknown as string }),
    ];

    const filtered = filterRisks(risks, {
      search: '',
      status: 'unknown',
      statusCategory: 'all',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: '',
      createdFrom: '',
      createdTo: '',
    });

    expect(filtered.map((risk) => risk.uuid)).toEqual(['r2', 'r3', 'r4']);
  });

  it('filters addressed status category to accepted and mitigation-complete', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r2', status: 'mitigating-implemented' }),
      makeRisk({ uuid: 'r3', status: 'closed' }),
      makeRisk({ uuid: 'r4', status: 'open' }),
    ];

    const addressed = filterRisks(risks, {
      search: '',
      status: 'all',
      statusCategory: 'addressed',
      likelihood: 'all',
      impact: 'all',
      owner: '',
      review: 'all',
      controlId: '',
      evidenceId: '',
      riskId: '',
      createdFrom: '',
      createdTo: '',
    });

    expect(addressed.map((risk) => risk.uuid)).toEqual(['r1', 'r2']);
  });

  it('does not classify addressed statuses as open', () => {
    expect(isOpenStatus('open')).toBe(true);
    expect(isOpenStatus('investigating')).toBe(true);
    expect(isOpenStatus('risk-accepted')).toBe(false);
    expect(isOpenStatus('mitigation-complete')).toBe(false);
    expect(isOpenStatus('closed')).toBe(false);
  });

  it('normalizes medium and moderate filter values', () => {
    expect(formatRiskFilterLevel('medium')).toBe('moderate');
    expect(formatRiskFilterLevel('moderate')).toBe('moderate');
  });

  it('reads supported risk filters from query params', () => {
    const parsed = readRiskFiltersFromQuery({
      search: 'db',
      status: 'open',
      statusCategory: 'accepted',
      likelihood: 'moderate',
      impact: 'high',
      owner: 'alice',
      review: 'overdue',
      controlId: 'AC-2',
      evidenceId: 'ev-12',
      riskId: 'risk-9',
      createdFrom: '2026-03-01T00:00:00Z',
      createdTo: '2026-03-02T00:00:00Z',
    });

    expect(parsed).toEqual({
      search: 'db',
      status: 'open',
      statusCategory: 'accepted',
      likelihood: 'moderate',
      impact: 'high',
      owner: 'alice',
      review: 'overdue',
      controlId: 'AC-2',
      evidenceId: 'ev-12',
      riskId: 'risk-9',
      createdFrom: '2026-03-01T00:00:00Z',
      createdTo: '2026-03-02T00:00:00Z',
    });
  });

  it('computes severity score from likelihood x impact', () => {
    const risk = makeRisk({
      likelihood: 'high',
      impact: 'critical',
    });

    expect(getRiskSeverityScore(risk)).toBe(12);
    expect(getRiskSeverityLevel(risk)).toBe('critical');
  });

  it('maps severity levels from score thresholds', () => {
    expect(getRiskSeverityLevelFromScore(0)).toBe('unknown');
    expect(getRiskSeverityLevelFromScore(1)).toBe('low');
    expect(getRiskSeverityLevelFromScore(4)).toBe('medium');
    expect(getRiskSeverityLevelFromScore(8)).toBe('high');
    expect(getRiskSeverityLevelFromScore(12)).toBe('critical');
  });

  it('returns unknown severity when likelihood or impact is missing', () => {
    const missingLikelihood = makeRisk({
      impact: 'high',
    });
    const missingImpact = makeRisk({
      likelihood: 'high',
    });

    expect(getRiskSeverityScore(missingLikelihood)).toBe(0);
    expect(getRiskSeverityLevel(missingLikelihood)).toBe('unknown');
    expect(getRiskSeverityScore(missingImpact)).toBe(0);
    expect(getRiskSeverityLevel(missingImpact)).toBe('unknown');
  });

  it('reads likelihood and impact from remarks hints', () => {
    const risk = makeRisk({
      remarks: 'Likelihood hint: moderate\nImpact hint: high',
    });

    expect(getRiskSeverityScore(risk)).toBe(6);
    expect(getRiskSeverityLevel(risk)).toBe('medium');
  });
});
