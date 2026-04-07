import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
} from '@/utils/slack-link-callback';
import SlackLinkCallbackView from '../SlackLinkCallbackView.vue';

const { mockRoute, mockReplace, mockIsNavigationFailure } = vi.hoisted(() => ({
  mockRoute: {
    query: {} as Record<string, unknown>,
  },
  mockReplace: vi.fn(),
  mockIsNavigationFailure: vi.fn(
    (value: unknown) =>
      typeof value === 'object' &&
      value !== null &&
      '__navigationFailure' in value &&
      value.__navigationFailure === true,
  ),
}));

vi.mock('vue-router', () => ({
  isNavigationFailure: mockIsNavigationFailure,
  useRoute: () => mockRoute,
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

describe('SlackLinkCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
    mockReplace.mockResolvedValue(undefined);
  });

  it('shows success message and redirects with success query', async () => {
    mockRoute.query = {
      status: 'success',
    };

    const wrapper = mount(SlackLinkCallbackView);
    await nextTick();

    expect(wrapper.text()).toContain(
      'Slack linking completed. Returning to Preferences...',
    );
    expect(mockReplace).toHaveBeenCalledWith({
      name: 'preferences',
      query: {
        [CALLBACK_STATUS_QUERY_KEY]: 'success',
      },
    });
  });

  it('shows error message with code and redirects with status and code query', async () => {
    mockRoute.query = {
      status: 'error',
      code: 'not_configured',
    };

    const wrapper = mount(SlackLinkCallbackView);
    await nextTick();

    expect(wrapper.text()).toContain(
      'Slack linking failed (not_configured). Returning to Preferences...',
    );
    expect(mockReplace).toHaveBeenCalledWith({
      name: 'preferences',
      query: {
        [CALLBACK_STATUS_QUERY_KEY]: 'error',
        [CALLBACK_CODE_QUERY_KEY]: 'not_configured',
      },
    });
  });

  it('falls back to manual return button when redirect fails', async () => {
    mockRoute.query = {
      status: 'error',
    };
    mockReplace.mockRejectedValueOnce(new Error('navigation failed'));

    const wrapper = mount(SlackLinkCallbackView);
    await vi.waitFor(() => {
      expect(wrapper.find('button').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain(
      'Slack linking failed. Click below to return to Preferences.',
    );
    expect(wrapper.find('button').text()).toContain('Return to Preferences');
  });

  it('falls back to manual return button when redirect resolves with a navigation failure', async () => {
    mockRoute.query = {
      status: 'error',
    };
    mockReplace.mockResolvedValueOnce({ __navigationFailure: true });

    const wrapper = mount(SlackLinkCallbackView);
    await vi.waitFor(() => {
      expect(wrapper.find('button').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain(
      'Slack linking failed. Click below to return to Preferences.',
    );
    expect(mockIsNavigationFailure).toHaveBeenCalled();
  });
});
