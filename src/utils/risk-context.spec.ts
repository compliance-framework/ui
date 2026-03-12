import { describe, expect, it } from 'vitest';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  resolveRiskContext,
} from './risk-context';

describe('risk-context', () => {
  it('resolves root risk routes to SSP context', () => {
    const result = resolveRiskContext({
      routeName: 'risks:index',
      selectedSspId: 'ssp-1',
    });

    expect(result).toEqual({
      scope: 'ssp',
      id: 'ssp-1',
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

  it('resolves POAM route context from route id', () => {
    const result = resolveRiskContext({
      routeName: 'plan-of-action-and-milestones-risk-detail',
      routeId: 'poam-22',
    });

    expect(result).toEqual({
      scope: 'poam',
      id: 'poam-22',
      listRouteName: 'plan-of-action-and-milestones-risks',
      detailRouteName: 'plan-of-action-and-milestones-risk-detail',
    });
  });

  it('does not infer POAM context from selected poam id fallback', () => {
    const result = resolveRiskContext({
      routeName: null,
      selectedPoamId: 'poam-55',
    });

    expect(result).toBeNull();
  });

  it('returns null when required context is missing', () => {
    const result = resolveRiskContext({
      routeName: 'risks:detail',
      selectedSspId: '',
    });

    expect(result).toBeNull();
  });

  it('builds collection and item endpoints for both scopes', () => {
    const rootContext = resolveRiskContext({
      routeName: 'risks:index',
      selectedSspId: 'ssp-44',
    });
    const sspContext = resolveRiskContext({
      routeName: 'system-security-plan-risks',
      routeId: 'ssp-44',
    });

    expect(rootContext).not.toBeNull();
    expect(sspContext).not.toBeNull();

    expect(buildRiskCollectionEndpoint(rootContext!)).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks',
    );
    expect(buildRiskItemEndpoint(rootContext!, 'risk-1')).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks/risk-1',
    );

    expect(buildRiskCollectionEndpoint(sspContext!)).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks',
    );
    expect(buildRiskItemEndpoint(sspContext!, 'risk-2')).toBe(
      '/api/oscal/system-security-plans/ssp-44/risks/risk-2',
    );
  });
});
