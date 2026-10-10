import { describe, expect, it } from 'vitest';
import type { Risk } from '@/oscal';
import { getRiskIdentifier, sameRiskIdentifier } from './risk-id';

function makeRisk(overrides: Partial<Risk> & Record<string, unknown>): Risk {
  return {
    uuid: 'default-uuid',
    title: 'Risk',
    description: 'Description',
    statement: 'Statement',
    status: 'open',
    ...overrides,
  } as Risk;
}

describe('risk-id', () => {
  it('prefers uuid when available', () => {
    const risk = makeRisk({ uuid: 'uuid-1', id: 'display-id' });
    expect(getRiskIdentifier(risk)).toBe('uuid-1');
  });

  it('falls back to riskUuid/id/riskId when uuid is missing', () => {
    expect(
      getRiskIdentifier(makeRisk({ uuid: '', riskUuid: 'risk-uuid-1' })),
    ).toBe('risk-uuid-1');
    expect(
      getRiskIdentifier(makeRisk({ uuid: '', riskUuid: '', id: 'id-1' })),
    ).toBe('id-1');
    expect(
      getRiskIdentifier(
        makeRisk({ uuid: '', riskUuid: '', id: '', riskId: 'rid-1' }),
      ),
    ).toBe('rid-1');
  });

  it('compares two risks by resolved identifier', () => {
    const left = makeRisk({ uuid: '', riskUuid: 'r-1' });
    const right = makeRisk({ uuid: 'r-1' });

    expect(sameRiskIdentifier(left, right)).toBe(true);
  });
});
