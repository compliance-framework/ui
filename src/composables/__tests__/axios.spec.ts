import { describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthenticatedInstance } from '@/composables/axios';

vi.mock('@/stores/config.ts', () => ({
  useConfigStore: () => ({
    getConfig: vi.fn(async () => ({ API_URL: 'http://api.test' })),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock('@/stores/permissions', () => ({
  usePermissionsStore: () => ({
    hydrate: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

describe('axios response conversion', () => {
  it('preserves dashboard suggestion label-map keys inside DataResponse arrays', async () => {
    const instance = useAuthenticatedInstance();

    const response = await instance.get('/dashboard-suggestions', {
      // This endpoint returns camelCase field names; camelcase-keys matches
      // stopPaths against the original keys, so the stop path is camelCase too.
      camelcaseStopPaths: ['data.proposedFilterLabelSet'],
      adapter: async (config) => ({
        data: {
          data: [
            {
              id: 'suggestion-1',
              proposedFilterLabelSet: {
                _policy: 'x',
                service_name: 'api',
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    });

    expect(response.data.data[0]).toEqual({
      id: 'suggestion-1',
      proposedFilterLabelSet: {
        _policy: 'x',
        service_name: 'api',
      },
    });
  });
});

describe('jsonBody', () => {
  it('serialises without key transformation and sets the JSON content type', async () => {
    const { jsonBody } = await import('@/composables/axios');
    const { AxiosHeaders } = await import('axios');
    const headers = new AxiosHeaders();
    const data = { overlay: { policy_data: { a_b: 1 }, 'kebab-key': 2 } };
    expect(jsonBody(data, headers)).toBe(JSON.stringify(data));
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});

describe('agent config stop paths', () => {
  const adapterFor =
    (payload: unknown) => async (config: InternalAxiosRequestConfig) => ({
      data: payload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

  it('keeps snake_case overlay keys verbatim (config)', async () => {
    const { STOP_PATHS } = await import(
      '@/composables/agent-config/useAgentConfigApi'
    );
    const instance = useAuthenticatedInstance();
    const response = await instance.get('/x', {
      camelcaseStopPaths: STOP_PATHS.config,
      adapter: adapterFor({
        data: {
          'agent-id': 'a',
          overlay: {
            plugins: { 'local-ssh': { policy_data: { max_auth_tries: 3 } } },
          },
        },
      }),
    });
    expect(response.data.data).toEqual({
      agentId: 'a',
      overlay: {
        plugins: { 'local-ssh': { policy_data: { max_auth_tries: 3 } } },
      },
    });
  });

  it('keeps base/effective/remote-config verbatim inside arrays (instances list)', async () => {
    const { STOP_PATHS } = await import(
      '@/composables/agent-config/useAgentConfigApi'
    );
    const instance = useAuthenticatedInstance();
    const response = await instance.get('/x', {
      camelcaseStopPaths: STOP_PATHS.instances,
      adapter: adapterFor({
        data: [
          {
            'instance-id': 'i',
            'remote-config': {
              trusted_sources: ['a'],
              overridable_config_flags: [],
            },
            base: { agent_evidence: { emit_on_run_completion: true } },
            'report-stale': false,
          },
        ],
        meta: { 'desired-revision': 7, counts: { 'in-sync': 1 } },
      }),
    });
    expect(response.data).toEqual({
      data: [
        {
          instanceId: 'i',
          remoteConfig: {
            trusted_sources: ['a'],
            overridable_config_flags: [],
          },
          base: { agent_evidence: { emit_on_run_completion: true } },
          reportStale: false,
        },
      ],
      meta: { desiredRevision: 7, counts: { inSync: 1 } },
    });
  });

  it('keeps preview effective and diff values verbatim', async () => {
    const { STOP_PATHS } = await import(
      '@/composables/agent-config/useAgentConfigApi'
    );
    const instance = useAuthenticatedInstance();
    const response = await instance.get('/x', {
      camelcaseStopPaths: STOP_PATHS.preview,
      adapter: adapterFor({
        data: {
          instances: [
            {
              'instance-id': 'i',
              effective: { agent_evidence: { emit_on_run_completion: true } },
              'diff-vs-current': [
                { path: '/p', op: 'replace', from: { a_b: 1 }, to: { c_d: 2 } },
              ],
              'will-apply-reason': 'mode-report',
            },
          ],
        },
      }),
    });
    expect(response.data.data.instances[0]).toEqual({
      instanceId: 'i',
      effective: { agent_evidence: { emit_on_run_completion: true } },
      diffVsCurrent: [
        { path: '/p', op: 'replace', from: { a_b: 1 }, to: { c_d: 2 } },
      ],
      willApplyReason: 'mode-report',
    });
  });
});
