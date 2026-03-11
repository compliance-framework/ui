import { describe, expect, it } from 'vitest';
import type { ByComponent } from '@/oscal';
import {
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
      },
      {
        componentUuid: 'comp-2',
        title: 'Firewall',
        type: 'hardware',
        description: 'Filters traffic',
        purpose: 'Protect boundary',
        definedComponentId: 'comp-2',
        componentDefinitionId: 'comp-def-2',
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

  it('builds endpoint paths for by-components and suggestions', () => {
    expect(buildByComponentsEndpoint('ssp-1', 'req-1', 'stmt-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components',
    );

    expect(buildSuggestComponentsEndpoint('ssp-1', 'req-1')).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/suggest-components',
    );
  });
});
