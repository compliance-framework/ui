import { describe, expect, it, vi } from 'vitest';
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
      camelcaseStopPaths: ['data.proposed_filter_label_set'],
      adapter: async (config) => ({
        data: {
          data: [
            {
              id: 'suggestion-1',
              proposed_filter_label_set: {
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
