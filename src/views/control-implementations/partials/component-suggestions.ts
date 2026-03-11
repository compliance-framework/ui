import type { ByComponent } from '@/oscal';

export interface SystemComponentSuggestion {
  name: string;
  type: string;
  description: string;
  purpose: string;
  definedComponentId: string;
  componentDefinitionId: string;
}

export interface SuggestedComponent {
  componentUuid: string;
  title: string;
  type: string;
  description: string;
  purpose: string;
  definedComponentId: string;
  componentDefinitionId: string;
  relevanceScore?: number;
}

type SuggestionPayload = SystemComponentSuggestion[] | undefined | null;

export function normalizeSuggestedComponentsResponse(
  payload: SuggestionPayload,
): SuggestedComponent[] {
  const rawSuggestions = payload ?? [];
  const deduped = new Map<string, SuggestedComponent>();

  for (const suggestion of rawSuggestions) {
    if (!suggestion.definedComponentId) {
      continue;
    }

    deduped.set(suggestion.definedComponentId, {
      componentUuid: suggestion.definedComponentId,
      title: suggestion.name,
      type: suggestion.type,
      description: suggestion.description,
      purpose: suggestion.purpose,
      definedComponentId: suggestion.definedComponentId,
      componentDefinitionId: suggestion.componentDefinitionId,
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
