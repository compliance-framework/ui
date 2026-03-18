import { describe, expect, it } from 'vitest';
import type { Risk, RiskLogEntry } from '@/oscal';
import {
  getRiskAssociations,
  normalizeRiskEvents,
  normalizeRiskReviews,
  withUpdatedRiskAssociations,
} from './risk-detail';

function makeRisk(overrides: Partial<Risk> & Record<string, unknown>): Risk {
  return {
    uuid: 'risk-1',
    title: 'Risk',
    description: 'Description',
    statement: 'Statement',
    status: 'open',
    ...overrides,
  } as Risk;
}

describe('risk-detail', () => {
  it('normalizes and deduplicates evidence associations', () => {
    const risk = makeRisk({
      relatedEvidence: [
        { evidenceId: 'ev-1', title: 'Evidence A' },
        { evidenceUuid: 'ev-1', title: 'Evidence A duplicate' },
      ],
      evidence: [{ id: 'ev-2', title: 'Evidence B' }],
    });

    const associations = getRiskAssociations(risk, 'evidence');

    expect(associations).toHaveLength(2);
    expect(associations.map((item) => item.id)).toEqual(['ev-1', 'ev-2']);
  });

  it('updates existing association field when persisting', () => {
    const risk = makeRisk({
      relatedControls: [{ controlId: 'AC-1', title: 'Access Control' }],
    });

    const updated = withUpdatedRiskAssociations(risk, 'controls', [
      {
        id: 'SC-7',
        title: 'Boundary Protection',
        controlId: 'SC-7',
        catalogName: 'NIST SP 800-53',
      },
    ]) as Risk & {
      relatedControls?: Array<{ controlId: string }>;
      controlIds?: string[];
    };

    expect(updated.relatedControls).toEqual([
      expect.objectContaining({ controlId: 'SC-7' }),
    ]);
    expect(updated.controlIds).toEqual(['SC-7']);
  });

  it('persists evidence uuid while keeping evidence id for UI routing', () => {
    const risk = makeRisk({
      relatedEvidence: [{ evidenceUuid: 'uuid-old', evidenceId: 'ev-old' }],
    });

    const updated = withUpdatedRiskAssociations(risk, 'evidence', [
      {
        id: 'ev-101',
        evidenceId: 'ev-101',
        evidenceUuid: 'uuid-101',
        title: 'Evidence 101',
      },
    ]) as Risk & {
      relatedEvidence?: Array<{ evidenceId?: string; evidenceUuid?: string }>;
      evidenceIds?: string[];
    };

    expect(updated.relatedEvidence).toEqual([
      expect.objectContaining({
        evidenceId: 'ev-101',
        evidenceUuid: 'uuid-101',
      }),
    ]);
    expect(updated.evidenceIds).toEqual(['ev-101']);
  });

  it('does not copy uuid into evidenceId when only uuid is present', () => {
    const risk = makeRisk({
      relatedEvidence: [
        { evidenceUuid: 'uuid-only', title: 'Legacy evidence' },
      ],
    });

    const associations = getRiskAssociations(risk, 'evidence');
    expect(associations[0].id).toBe('uuid-only');
    expect(associations[0].evidenceId).toBeUndefined();
    expect(associations[0].evidenceUuid).toBe('uuid-only');

    const updated = withUpdatedRiskAssociations(
      risk,
      'evidence',
      associations,
    ) as Risk & {
      relatedEvidence?: Array<{ evidenceId?: string; evidenceUuid?: string }>;
      evidenceIds?: string[];
    };

    expect(updated.relatedEvidence).toEqual([
      expect.objectContaining({
        evidenceId: undefined,
        evidenceUuid: 'uuid-only',
      }),
    ]);
    expect(updated.evidenceIds).toEqual(['uuid-only']);
  });

  it('reads component associations from componentIds fallback', () => {
    const risk = makeRisk({
      componentIds: ['comp-1', 'comp-2'],
    });

    const associations = getRiskAssociations(risk, 'components');

    expect(associations.map((item) => item.id)).toEqual(['comp-1', 'comp-2']);
  });

  it('normalizes events from raw event payload', () => {
    const events = normalizeRiskEvents([
      {
        uuid: 'evt-2',
        eventType: 'status-changed',
        createdAt: '2026-03-10T10:00:00Z',
        actor: { displayName: 'Alice' },
        details: 'Status changed to open',
      },
      {
        uuid: 'evt-1',
        eventType: 'created',
        createdAt: '2026-03-09T10:00:00Z',
        actorName: 'Bob',
      },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'evt-2',
        type: 'status-changed',
        actor: 'Alice',
      }),
    );
  });

  it('normalizes events from nested data envelope payload', () => {
    const events = normalizeRiskEvents({
      data: {
        data: [
          {
            id: 'evt-nested-1',
            eventType: 'last_seen',
            createdAt: '2026-03-12T10:00:00Z',
          },
        ],
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'evt-nested-1',
        type: 'last_seen',
      }),
    );
  });

  it('falls back to risk log entries when event API returns empty', () => {
    const logEntries: RiskLogEntry[] = [
      {
        uuid: 'log-1',
        title: 'Reviewed',
        description: 'Quarterly review completed',
        start: '2026-03-08T10:00:00Z',
      },
    ];

    const events = normalizeRiskEvents([], logEntries);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'log-1',
        type: 'Reviewed',
        details: 'Quarterly review completed',
      }),
    );
  });

  it('normalizes reviews from raw review payload', () => {
    const reviews = normalizeRiskReviews([
      {
        uuid: 'review-3',
        decision: 'reassess',
        reviewedAt: '2026-03-11T10:00:00Z',
        reviewerName: 'Charlie',
        notes: 'Likelihood updated to high after new intel',
      },
      {
        uuid: 'review-2',
        decision: 'extend',
        reviewedAt: '2026-03-10T10:00:00Z',
        reviewer: { displayName: 'Alice' },
        notes: 'Keep accepted status',
        nextReviewDeadline: '2026-06-01T00:00:00Z',
      },
      {
        uuid: 'review-1',
        decision: 'reopen',
        reviewedAt: '2026-03-09T10:00:00Z',
        reviewerName: 'Bob',
        reviewJustification: 'Risk is no longer acceptable.',
      },
    ]);

    expect(reviews).toHaveLength(3);
    expect(reviews[0]).toEqual(
      expect.objectContaining({
        id: 'review-3',
        decision: 'reassess',
        reviewer: 'Charlie',
      }),
    );
    expect(reviews[1]).toEqual(
      expect.objectContaining({
        id: 'review-2',
        decision: 'extend',
        reviewer: 'Alice',
      }),
    );
    expect(reviews[2]).toEqual(
      expect.objectContaining({
        id: 'review-1',
        decision: 'reopen',
        reviewer: 'Bob',
        notes: 'Risk is no longer acceptable.',
      }),
    );
  });

  it('normalizes reviews from nested data envelope payload', () => {
    const reviews = normalizeRiskReviews({
      data: {
        data: [
          {
            id: 'review-nested-1',
            decision: 'reassess',
            reviewedAt: '2026-03-11T10:00:00Z',
            reviewerName: 'Nested Reviewer',
          },
        ],
      },
    });

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual(
      expect.objectContaining({
        id: 'review-nested-1',
        decision: 'reassess',
        reviewer: 'Nested Reviewer',
      }),
    );
  });

  it('uses deterministic fallback review ids when API id is missing', () => {
    const payload = [
      {
        decision: 'extend',
        reviewedAt: '2026-03-20T10:00:00Z',
        reviewerName: 'Deterministic Reviewer',
        reviewJustification: 'Still accepted after controls review.',
      },
    ];

    const first = normalizeRiskReviews(payload);
    const second = normalizeRiskReviews(payload);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].id).toMatch(/^review-/);
  });
});
