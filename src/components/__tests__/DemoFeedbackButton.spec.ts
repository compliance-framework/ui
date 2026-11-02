import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DemoFeedbackButton from '../DemoFeedbackButton.vue';

const { mockConfigStore, mockToastAdd } = vi.hoisted(() => ({
  mockConfigStore: { getConfig: vi.fn() },
  mockToastAdd: vi.fn(),
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: () => mockConfigStore,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: mockToastAdd }),
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    template: '<div v-if="visible" class="dialog"><slot /></div>',
    props: ['visible', 'modal', 'header'],
  },
}));

const FEEDBACK_URL = 'https://demo.example.com/api/feedback';

async function mountButton(url: string | undefined) {
  mockConfigStore.getConfig.mockResolvedValue({
    API_URL: '',
    DEMO_FEEDBACK_URL: url,
  });
  const wrapper = mount(DemoFeedbackButton, {
    global: {
      stubs: {
        PrimaryButton: {
          template:
            '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
          props: ['disabled'],
        },
        SecondaryButton: {
          template: '<button v-bind="$attrs"><slot /></button>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('DemoFeedbackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing without DEMO_FEEDBACK_URL', async () => {
    const wrapper = await mountButton('');
    expect(wrapper.find('[data-testid="demo-feedback-button"]').exists()).toBe(
      false,
    );
  });

  it('sends feedback with credentials to the portal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await mountButton(FEEDBACK_URL);

    await wrapper.find('[data-testid="demo-feedback-button"]').trigger('click');
    await wrapper
      .find('[data-testid="demo-feedback-message"]')
      .setValue('Love the dashboards');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      FEEDBACK_URL,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      message: 'Love the dashboards',
      page: window.location.href,
    });
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('shows the portal error and keeps the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Please sign in to the demo portal again.',
        }),
      }),
    );
    const wrapper = await mountButton(FEEDBACK_URL);

    await wrapper.find('[data-testid="demo-feedback-button"]').trigger('click');
    await wrapper.find('[data-testid="demo-feedback-message"]').setValue('Hi');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="demo-feedback-error"]').text()).toBe(
      'Please sign in to the demo portal again.',
    );
    expect(
      (
        wrapper.find('[data-testid="demo-feedback-message"]')
          .element as HTMLTextAreaElement
      ).value,
    ).toBe('Hi');
    expect(mockToastAdd).not.toHaveBeenCalled();
  });

  it('does not send blank feedback', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await mountButton(FEEDBACK_URL);

    await wrapper.find('[data-testid="demo-feedback-button"]').trigger('click');
    await wrapper.find('[data-testid="demo-feedback-message"]').setValue('  ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
