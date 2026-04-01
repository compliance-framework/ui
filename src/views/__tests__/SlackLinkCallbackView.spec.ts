import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
} from '@/utils/slack-link-callback';
import SlackLinkCallbackView from '../SlackLinkCallbackView.vue';

const mockRoute = {
  query: {} as Record<string, unknown>,
};

const mockReplace = vi.fn();

vi.mock('vue-router', () => ({
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

    expect(wrapper.find('button').text()).toContain('Return to Preferences');
  });
});
