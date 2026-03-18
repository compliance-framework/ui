import { describe, expect, it } from 'vitest';
import type { ByComponent } from '@/oscal';
import {
  buildApplySuggestionEndpoint,
  buildApplySuggestionsEndpoint,
  buildByComponentsEndpoint,
  buildSuggestComponentsEndpoint,
  getUnappliedSuggestions,
  normalizeSuggestedComponentsResponse,
} from '@/views/control-implementations/partials/component-suggestions';

describe('component-suggestions helpers', () => {
  it('normalizes and deduplicates suggestions by component UUID', () => {
    const result = normalizeSuggestedComponentsResponse([
      {
        name: 'Web Server',
        type: 'software',
        description: 'Handles HTTP requests',
        purpose: 'Serve API traffic',
        definedComponentId: 'comp-1',
        componentDefinitionId: 'comp-def-1',
      },
      {
        name: 'Web Server Duplicate',
        type: 'software',
        description: 'Replacement for duplicate key',
        purpose: 'Serve API traffic',
        definedComponentId: 'comp-1',
        componentDefinitionId: 'comp-def-1',
        relevanceScore: 0.92,
      },
      {
        name: 'Firewall',
        type: 'hardware',
        description: 'Filters traffic',
        purpose: 'Protect boundary',
        definedComponentId: 'comp-2',
        componentDefinitionId: 'comp-def-2',
      },
    ]);

    expect(result).toEqual([
      {
        componentUuid: 'comp-1',
        title: 'Web Server Duplicate',
        type: 'software',
        description: 'Replacement for duplicate key',
        purpose: 'Serve API traffic',
        definedComponentId: 'comp-1',
        componentDefinitionId: 'comp-def-1',
        relevanceScore: 0.92,
      },
      {
        componentUuid: 'comp-2',
        title: 'Firewall',
        type: 'hardware',
        description: 'Filters traffic',
        purpose: 'Protect boundary',
        definedComponentId: 'comp-2',
        componentDefinitionId: 'comp-def-2',
        relevanceScore: undefined,
      },
    ]);
  });

  it('filters out suggestions already present in by-components', () => {
    const byComponents: ByComponent[] = [
      {
        uuid: 'by-comp-1',
        componentUuid: 'comp-1',
        description: '',
      },
    ];

    const suggestions = [
      {
        componentUuid: 'comp-1',
        title: 'Already linked',
        type: 'software',
        description: '',
        purpose: '',
        definedComponentId: 'comp-1',
        componentDefinitionId: 'comp-def-1',
      },
      {
        componentUuid: 'comp-2',
        title: 'New suggestion',
        type: 'service',
        description: '',
        purpose: '',
        definedComponentId: 'comp-2',
        componentDefinitionId: 'comp-def-2',
      },
    ];

    expect(getUnappliedSuggestions(byComponents, suggestions)).toEqual([
      {
        componentUuid: 'comp-2',
        title: 'New suggestion',
        type: 'service',
        description: '',
        purpose: '',
        definedComponentId: 'comp-2',
        componentDefinitionId: 'comp-def-2',
      },
    ]);
  });

  it('ignores malformed entries missing defined component ID', () => {
    const result = normalizeSuggestedComponentsResponse([
      {
        name: 'Missing ID',
        type: 'software',
        description: 'bad',
        purpose: 'bad',
      },
      {
        name: 'Valid',
        type: 'service',
        description: 'ok',
        purpose: 'ok',
        definedComponentId: 'comp-9',
        componentDefinitionId: 'comp-def-9',
      },
    ]);

    expect(result).toEqual([
      {
        componentUuid: 'comp-9',
        title: 'Valid',
        type: 'service',
        description: 'ok',
        purpose: 'ok',
        definedComponentId: 'comp-9',
        componentDefinitionId: 'comp-def-9',
        relevanceScore: undefined,
      },
    ]);
  });

  it('keeps missing text fields as undefined for UI fallback usage', () => {
    const result = normalizeSuggestedComponentsResponse([
      {
        definedComponentId: 'comp-fallback',
        componentDefinitionId: 'comp-def-fallback',
      },
    ]);

    expect(result).toEqual([
      {
        componentUuid: 'comp-fallback',
        title: undefined,
        type: undefined,
        description: undefined,
        purpose: undefined,
        definedComponentId: 'comp-fallback',
        componentDefinitionId: 'comp-def-fallback',
        relevanceScore: undefined,
      },
    ]);
  });

  it('accepts payload wrapped in a data envelope', () => {
    const result = normalizeSuggestedComponentsResponse({
      data: [
        {
          name: 'Wrapped',
          type: 'service',
          definedComponentId: 'comp-wrapped',
          componentDefinitionId: 'comp-def-wrapped',
        },
      ],
    });

    expect(result).toEqual([
      {
        componentUuid: 'comp-wrapped',
        title: 'Wrapped',
        type: 'service',
        description: undefined,
        purpose: undefined,
        definedComponentId: 'comp-wrapped',
        componentDefinitionId: 'comp-def-wrapped',
        relevanceScore: undefined,
      },
    ]);
  });

  it('ignores malformed suggestion entries without throwing', () => {
    const result = normalizeSuggestedComponentsResponse([
      null as unknown as {
        definedComponentId: string;
      },
      {
        name: 'Still valid',
        definedComponentId: 'comp-ok',
        componentDefinitionId: 'comp-def-ok',
      },
    ]);

    expect(result).toEqual([
      {
        componentUuid: 'comp-ok',
        title: 'Still valid',
        type: undefined,
        description: undefined,
        purpose: undefined,
        definedComponentId: 'comp-ok',
        componentDefinitionId: 'comp-def-ok',
        relevanceScore: undefined,
      },
    ]);
  });

  it('builds endpoint paths for by-components and suggestion actions', () => {
    expect(buildByComponentsEndpoint('ssp-1', 'req-1', 'stmt-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components',
    );

    expect(buildSuggestComponentsEndpoint('ssp-1', 'req-1', 'stmt-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/suggest-components',
    );

    expect(buildApplySuggestionEndpoint('ssp-1', 'req-1', 'stmt-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/apply-suggestion',
    );

    expect(buildApplySuggestionsEndpoint('ssp-1', 'req-1', 'stmt-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/apply-suggestions',
    );
  });
});
