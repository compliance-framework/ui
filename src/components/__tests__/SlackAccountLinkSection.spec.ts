import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
} from '@/utils/slack-link-callback';
import SlackAccountLinkSection from '../preferences/SlackAccountLinkSection.vue';

const {
  mockAxios,
  mockConfigStore,
  mockRoute,
  mockRouterReplace,
  mockToastAdd,
} = vi.hoisted(() => ({
  mockAxios: {
    get: vi.fn(),
    delete: vi.fn(),
  },
  mockConfigStore: {
    getConfig: vi.fn(),
  },
  mockRoute: {
    query: {} as Record<string, unknown>,
  },
  mockRouterReplace: vi.fn(),
  mockToastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => mockAxios,
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: () => mockConfigStore,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}));

describe('SlackAccountLinkSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
    mockRouterReplace.mockResolvedValue(undefined);
    mockAxios.get.mockResolvedValue({
      data: {
        data: {
          linked: false,
        },
      },
    });
    mockConfigStore.getConfig.mockResolvedValue({
      API_URL: 'https://example.test',
    });
  });

  it('loads linked Slack status and emits availability state', async () => {
    mockAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          linked: true,
          slackTeamDomain: 'openai',
          slackEmail: 'user@example.com',
        },
      },
    });

    const wrapper = mount(SlackAccountLinkSection);

    await flushPromises();
    await nextTick();

    expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/slack/link/status');
    expect(wrapper.text()).toContain('Connected to openai as user@example.com');
    expect(wrapper.find('button').text()).toBe('Unlink');

    const statusChangeEvents = wrapper.emitted('status-change');
    expect(statusChangeEvents?.[statusChangeEvents.length - 1]).toEqual([
      {
        loading: false,
        configured: true,
        linked: true,
      },
    ]);
  });

  it('shows not configured state when Slack linking endpoint returns 404', async () => {
    mockAxios.get.mockRejectedValueOnce({
      response: {
        status: 404,
      },
    });

    const wrapper = mount(SlackAccountLinkSection);

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain(
      'Slack linking is not configured for this environment.',
    );
    expect(mockToastAdd).not.toHaveBeenCalled();

    const statusChangeEvents = wrapper.emitted('status-change');
    expect(statusChangeEvents?.[statusChangeEvents.length - 1]).toEqual([
      {
        loading: false,
        configured: false,
        linked: false,
      },
    ]);
  });

  it('clears callback query params and shows a success toast for a successful callback', async () => {
    mockRoute.query = {
      [CALLBACK_STATUS_QUERY_KEY]: 'success',
      keep: 'value',
    };
    mockAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          linked: true,
          slackTeamDomain: 'openai',
          slackEmail: 'user@example.com',
        },
      },
    });

    mount(SlackAccountLinkSection);

    await flushPromises();
    await nextTick();

    expect(mockRouterReplace).toHaveBeenCalledWith({
      query: {
        keep: 'value',
      },
    });
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Slack Linked',
        detail: 'Slack account linked successfully.',
      }),
    );
  });

  it('clears callback query params and shows an error toast for an error callback', async () => {
    mockRoute.query = {
      [CALLBACK_STATUS_QUERY_KEY]: 'error',
      [CALLBACK_CODE_QUERY_KEY]: 'unauthorized',
      keep: 'value',
    };

    mount(SlackAccountLinkSection);

    await flushPromises();
    await nextTick();

    expect(mockRouterReplace).toHaveBeenCalledWith({
      query: {
        keep: 'value',
      },
    });
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Slack Linking Failed',
        detail: 'Unable to authenticate user for Slack linking',
      }),
    );
    expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/slack/link/status');
  });

  it('handles initialization failures and still loads Slack status', async () => {
    mockRoute.query = {
      [CALLBACK_STATUS_QUERY_KEY]: 'success',
    };
    mockRouterReplace.mockRejectedValueOnce(new Error('router failed'));

    const wrapper = mount(SlackAccountLinkSection);

    await flushPromises();
    await nextTick();

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Slack Linking Failed',
        detail: 'Failed to initialize Slack linking.',
      }),
    );
    expect(mockAxios.get).toHaveBeenCalledWith('/api/auth/slack/link/status');
    expect(wrapper.text()).toContain(
      'Link your Slack identity to this account.',
    );
    expect(wrapper.find('button').text()).toBe('Link');
  });
});
