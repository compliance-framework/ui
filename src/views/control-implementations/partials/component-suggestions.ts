import type { ByComponent } from '@/oscal';

export interface SystemComponentSuggestion {
  name?: string;
  type?: string;
  description?: string;
  purpose?: string;
  definedComponentId?: string;
  componentDefinitionId?: string;
  relevanceScore?: number;
}

export interface SuggestedComponent {
  componentUuid: string;
  title?: string;
  type?: string;
  description?: string;
  purpose?: string;
  definedComponentId: string;
  componentDefinitionId?: string;
  relevanceScore?: number;
}

type SuggestionPayload =
  | SystemComponentSuggestion[]
  | { data?: SystemComponentSuggestion[] | null }
  | undefined
  | null;

function toArrayPayload(
  payload: SuggestionPayload,
): SystemComponentSuggestion[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  return [];
}

function getRelevanceScore(
  suggestion: SystemComponentSuggestion,
): number | undefined {
  const { relevanceScore } = suggestion as {
    relevanceScore?: number | string;
  };
  if (typeof relevanceScore === 'number' && Number.isFinite(relevanceScore)) {
    return relevanceScore;
  }
  if (typeof relevanceScore === 'string') {
    const parsed = Number.parseFloat(relevanceScore);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function normalizeSuggestedComponentsResponse(
  payload: SuggestionPayload,
): SuggestedComponent[] {
  const rawSuggestions = toArrayPayload(payload);
  const deduped = new Map<string, SuggestedComponent>();

  for (const suggestion of rawSuggestions) {
    if (!suggestion || typeof suggestion !== 'object') {
      continue;
    }
    if (!suggestion.definedComponentId) {
      continue;
    }

    const existing = deduped.get(suggestion.definedComponentId);
    deduped.set(suggestion.definedComponentId, {
      componentUuid: suggestion.definedComponentId,
      title: suggestion.name ?? existing?.title,
      type: suggestion.type ?? existing?.type,
      description: suggestion.description ?? existing?.description,
      purpose: suggestion.purpose ?? existing?.purpose,
      definedComponentId: suggestion.definedComponentId,
      componentDefinitionId:
        suggestion.componentDefinitionId ?? existing?.componentDefinitionId,
      relevanceScore: getRelevanceScore(suggestion) ?? existing?.relevanceScore,
    });
  }

  return Array.from(deduped.values());
}

export function getExistingComponentUuidSet(
  byComponents: ByComponent[] | undefined,
): Set<string> {
  return new Set(
    (byComponents ?? [])
      .map((component) => component.componentUuid)
      .filter((uuid): uuid is string => Boolean(uuid)),
  );
}

export function getUnappliedSuggestions(
  byComponents: ByComponent[] | undefined,
  suggestions: SuggestedComponent[],
): SuggestedComponent[] {
  const existing = getExistingComponentUuidSet(byComponents);
  return suggestions.filter(
    (suggestion) => !existing.has(suggestion.componentUuid),
  );
}

export function buildByComponentsEndpoint(
  sspId: string,
  implementationUuid: string,
  statementUuid: string,
): string {
  return `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementationUuid}/statements/${statementUuid}/by-components`;
}

export function buildSuggestComponentsEndpoint(
  sspId: string,
  implementationUuid: string,
  statementUuid: string,
): string {
  return `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementationUuid}/statements/${statementUuid}/suggest-components`;
}

export function buildApplySuggestionEndpoint(
  sspId: string,
  implementationUuid: string,
  statementUuid: string,
): string {
  return `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementationUuid}/statements/${statementUuid}/apply-suggestion`;
}

export function buildApplySuggestionsEndpoint(
  sspId: string,
  implementationUuid: string,
  statementUuid: string,
): string {
  return `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementationUuid}/statements/${statementUuid}/apply-suggestions`;
}
