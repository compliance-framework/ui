import { describe, expect, it } from 'vitest';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  resolveRiskContext,
} from './risk-context';

describe('risk-context', () => {
  it('resolves root risk routes to POA&M context', () => {
    const result = resolveRiskContext({
      routeName: 'risks:index',
      selectedPoamId: 'poam-1',
    });

    expect(result).toEqual({
      scope: 'poam',
      id: 'poam-1',
      listRouteName: 'risks:index',
      detailRouteName: 'risks:detail',
    });
  });

  it('resolves SSP route context from route id', () => {
    const result = resolveRiskContext({
      routeName: 'system-security-plan-risk-detail',
      routeId: 'ssp-22',
    });

    expect(result).toEqual({
      scope: 'ssp',
      id: 'ssp-22',
      listRouteName: 'system-security-plan-risks',
      detailRouteName: 'system-security-plan-risk-detail',
    });
  });

  it('returns null when required context is missing', () => {
    const result = resolveRiskContext({
      routeName: 'risks:detail',
      selectedPoamId: '',
    });

    expect(result).toBeNull();
  });

  it('builds collection and item endpoints for both scopes', () => {
    const poamContext = resolveRiskContext({
      routeName: 'risks:index',
      selectedPoamId: 'poam-44',
    });
    const sspContext = resolveRiskContext({
      routeName: 'system-security-plan-risks',
      routeId: 'ssp-44',
    });

    expect(poamContext).not.toBeNull();
    expect(sspContext).not.toBeNull();

    expect(buildRiskCollectionEndpoint(poamContext!)).toBe(
      '/api/oscal/plan-of-action-and-milestones/poam-44/risks',
    );
    expect(buildRiskItemEndpoint(poamContext!, 'risk-1')).toBe(
      '/api/oscal/plan-of-action-and-milestones/poam-44/risks/risk-1',
    );

    expect(buildRiskCollectionEndpoint(sspContext!)).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks',
    );
    expect(buildRiskItemEndpoint(sspContext!, 'risk-2')).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks/risk-2',
    );
  });
});
