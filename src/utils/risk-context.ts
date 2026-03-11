export type RiskScope = 'poam' | 'ssp';

type RiskRouteName =
  | 'risks:index'
  | 'risks:detail'
  | 'plan-of-action-and-milestones-risks'
  | 'plan-of-action-and-milestones-risk-detail'
  | 'system-security-plan-risks'
  | 'system-security-plan-risk-detail';

export interface ResolveRiskContextInput {
  routeName?: string | symbol | null;
  routeId?: string | null;
  selectedPoamId?: string | null;
  selectedSspId?: string | null;
}

export interface RiskContext {
  scope: RiskScope;
  id: string;
  listRouteName: RiskRouteName;
  detailRouteName: RiskRouteName;
}

function normalizeRouteName(
  routeName?: string | symbol | null,
): RiskRouteName | null {
  if (typeof routeName !== 'string') return null;

  if (
    routeName === 'risks:index' ||
    routeName === 'risks:detail' ||
    routeName === 'plan-of-action-and-milestones-risks' ||
    routeName === 'plan-of-action-and-milestones-risk-detail' ||
    routeName === 'system-security-plan-risks' ||
    routeName === 'system-security-plan-risk-detail'
  ) {
    return routeName;
  }

  return null;
}

export function resolveRiskContext(
  input: ResolveRiskContextInput,
): RiskContext | null {
  const routeName = normalizeRouteName(input.routeName);
  const routeId = input.routeId ?? '';
  const selectedPoamId = input.selectedPoamId ?? '';
  const selectedSspId = input.selectedSspId ?? '';

  if (
    routeName === 'system-security-plan-risks' ||
    routeName === 'system-security-plan-risk-detail'
  ) {
    return routeId
      ? {
          scope: 'ssp',
          id: routeId,
          listRouteName: 'system-security-plan-risks',
          detailRouteName: 'system-security-plan-risk-detail',
        }
      : null;
  }

  if (
    routeName === 'plan-of-action-and-milestones-risks' ||
    routeName === 'plan-of-action-and-milestones-risk-detail'
  ) {
    return routeId
      ? {
          scope: 'poam',
          id: routeId,
          listRouteName: 'plan-of-action-and-milestones-risks',
          detailRouteName: 'plan-of-action-and-milestones-risk-detail',
        }
      : null;
  }

  if (routeName === 'risks:index' || routeName === 'risks:detail') {
    if (!selectedPoamId) return null;
    return {
      scope: 'poam',
      id: selectedPoamId,
      listRouteName: 'risks:index',
      detailRouteName: 'risks:detail',
    };
  }

  if (routeId && selectedSspId && routeId === selectedSspId) {
    return {
      scope: 'ssp',
      id: routeId,
      listRouteName: 'system-security-plan-risks',
      detailRouteName: 'system-security-plan-risk-detail',
    };
  }

  if (selectedPoamId) {
    return {
      scope: 'poam',
      id: selectedPoamId,
      listRouteName: 'risks:index',
      detailRouteName: 'risks:detail',
    };
  }

  return null;
}

export function buildRiskCollectionEndpoint(context: RiskContext): string {
  if (context.scope === 'ssp') {
    return `/api/oscal/system-security-plans/${context.id}/risks`;
  }
  return `/api/oscal/plan-of-action-and-milestones/${context.id}/risks`;
}

export function buildRiskItemEndpoint(
  context: RiskContext,
  riskId: string,
): string {
  return `${buildRiskCollectionEndpoint(context)}/${riskId}`;
}
