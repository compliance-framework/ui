import { describe, expect, it } from 'vitest';
import type { Dashboard } from '@/stores/filters';
import {
  buildControlLinksBody,
  buildCreateFilterBody,
  filterListParams,
} from '../evidenceFilterRequests';

const filter: Dashboard['filter'] = {
  scope: { condition: { label: 'provider', operator: '=', value: 'AWS' } },
};

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 'f-1',
    name: 'AWS access',
    sspId: 'ssp-1',
    filter,
    controls: [],
    components: [],
    ...overrides,
  };
}

describe('evidence filter requests', () => {
  it('scopes list requests to the active SSP', () => {
    expect(filterListParams('ssp-1', 'ac-2')).toEqual({
      controlId: 'ac-2',
      sspId: 'ssp-1',
    });
    expect(filterListParams('ssp-1')).toEqual({ sspId: 'ssp-1' });
  });

  it('omits sspId from list requests when no SSP is active', () => {
    expect(filterListParams('', 'ac-2')).toEqual({ controlId: 'ac-2' });
  });

  it('creates filters bound to the active SSP, with camelCase keys', () => {
    const body = buildCreateFilterBody('AWS access', filter, 'ac-2', 'ssp-1');

    expect(body).toEqual({
      name: 'AWS access',
      filter,
      controls: ['ac-2'],
      components: [],
      sspId: 'ssp-1',
    });
    expect(Object.keys(body)).not.toContain('ssp-id');
  });

  it('keeps an SSP-bound filter bound when its controls change', () => {
    const body = buildControlLinksBody(
      dashboard({ controls: [{ id: 'ac-1' } as Dashboard['controls'][0]] }),
      ['ac-1', 'ac-2'],
    );

    expect(body).toEqual({
      name: 'AWS access',
      filter,
      controls: ['ac-1', 'ac-2'],
      sspId: 'ssp-1',
    });
  });

  it('keeps a global filter global by sending an explicit null', () => {
    const body = buildControlLinksBody(dashboard({ sspId: undefined }), []);

    expect(body).toHaveProperty('sspId', null);
  });
});
