import { describe, expect, it } from 'vitest';
import type { Risk, RiskLogEntry } from '@/oscal';
import {
  getRiskAssociations,
  normalizeRiskEvents,
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
    ]) as Risk & { relatedControls?: Array<{ controlId: string }> };

    expect(updated.relatedControls).toEqual([
      expect.objectContaining({ controlId: 'SC-7' }),
    ]);
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
});
