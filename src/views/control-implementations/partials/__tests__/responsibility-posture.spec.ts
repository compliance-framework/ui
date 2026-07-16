import { describe, expect, it } from 'vitest';
import {
  inheritedResponsibilityRows,
  postureLabel,
  postureSeverity,
  satisfactionLabel,
  satisfactionSeverity,
} from '../responsibility-posture';
import type { LeveragedControl } from '@/types/ssp-leverage';
import type { Statement } from '@/oscal';

function makeLink(overrides: Partial<LeveragedControl> = {}): LeveragedControl {
  return {
    id: 'link-1',
    controlId: 'ac-2',
    statementId: 'ac-2_smt.a',
    inheritedFrom: {
      upstreamSspId: 'ssp-up',
      offeringId: 'off-1',
      offeringTitle: 'Baseline',
      offeringVersion: 2,
    },
    providedUuid: 'p-1',
    byComponentId: 'bc-1',
    satisfaction: 'partial',
    status: 'active',
    outstandingResponsibilities: [],
    responsibilityPosture: {},
    ...overrides,
  };
}

describe('responsibility posture helpers', () => {
  it('renders plain-language posture labels and severities', () => {
    expect(postureLabel('satisfied')).toBe('Covered');
    expect(postureLabel('not-satisfied')).toBe('Not covered');
    expect(postureLabel('unknown')).toBe('No evidence yet');
    expect(postureLabel(undefined)).toBe('No evidence yet');
    expect(postureSeverity('satisfied')).toBe('success');
    expect(postureSeverity('not-satisfied')).toBe('danger');
    expect(postureSeverity(undefined)).toBe('secondary');
    expect(satisfactionLabel('full')).toBe('Implemented');
    expect(satisfactionLabel('partial')).toBe('Action needed');
    expect(satisfactionSeverity('full')).toBe('success');
    expect(satisfactionSeverity('partial')).toBe('warn');
  });
});

describe('inheritedResponsibilityRows', () => {
  it('labels every responsibility from the upstream set, keeping satisfied text separate', () => {
    // r-2 is satisfied, so it has dropped out of outstandingResponsibilities — but the full
    // `responsibilities` set still carries its upstream text. The satisfied entry's
    // description ("how we handle this") must NOT become the responsibility's label.
    const link = makeLink({
      responsibilityPosture: { 'r-1': 'unknown', 'r-2': 'satisfied' },
      responsibilities: [
        { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
        { responsibilityUuid: 'r-2', description: 'Review access controls' },
      ],
      outstandingResponsibilities: [
        { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
      ],
    });
    const statement = {
      uuid: 'stmt-1',
      statementId: 'ac-2_smt.a',
      byComponents: [
        {
          uuid: 'bc-1',
          componentUuid: 'comp-1',
          description: 'x',
          satisfied: [
            {
              uuid: 's-1',
              responsibilityUuid: 'r-2',
              description: 'We review access quarterly',
            },
          ],
        },
      ],
    } as Statement;

    const rows = inheritedResponsibilityRows(link, statement);
    expect(rows).toHaveLength(2);

    const r1 = rows.find((r) => r.responsibilityUuid === 'r-1')!;
    expect(r1.description).toBe('Rotate your own keys');
    expect(r1.posture).toBe('unknown');
    expect(r1.satisfiedUuid).toBeUndefined();

    const r2 = rows.find((r) => r.responsibilityUuid === 'r-2')!;
    // The responsibility keeps its own upstream text…
    expect(r2.description).toBe('Review access controls');
    expect(r2.posture).toBe('satisfied');
    expect(r2.satisfiedUuid).toBe('s-1');
    // …while the handling note is surfaced separately.
    expect(r2.satisfiedDescription).toBe('We review access quarterly');
  });

  it('falls back to outstanding descriptions when the full set is absent (older payloads)', () => {
    const link = makeLink({
      responsibilities: undefined,
      responsibilityPosture: { 'r-1': 'unknown' },
      outstandingResponsibilities: [
        { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
      ],
    });
    const rows = inheritedResponsibilityRows(link);
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe('Rotate your own keys');
  });

  it('falls back to a generic description when neither side carries one', () => {
    const link = makeLink({ responsibilityPosture: { 'r-9': 'unknown' } });
    const rows = inheritedResponsibilityRows(link, undefined);
    expect(rows).toEqual([
      {
        responsibilityUuid: 'r-9',
        description: 'Inherited responsibility',
        posture: 'unknown',
        satisfiedUuid: undefined,
        satisfiedDescription: undefined,
      },
    ]);
  });

  it('includes outstanding uuids even if the posture map were to omit them', () => {
    const link = makeLink({
      responsibilityPosture: {},
      outstandingResponsibilities: [
        { responsibilityUuid: 'r-1', description: 'Something you must do' },
      ],
    });
    const rows = inheritedResponsibilityRows(link);
    expect(rows).toHaveLength(1);
    expect(rows[0].posture).toBeUndefined();
  });
});
