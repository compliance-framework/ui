import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import EvidenceView from '../EvidenceView.vue';

const state = vi.hoisted(() => ({
  sspId: 'ssp-1',
  get: vi.fn(),
}));

vi.mock('@/composables/useActiveSspId', () => ({
  useActiveSspId: () => computed(() => state.sspId),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: state.get }),
  decamelizeKeys: vi.fn(),
}));

function mountView() {
  return mount(EvidenceView, {
    global: {
      stubs: {
        NoActiveSystem: {
          props: ['subject'],
          template: '<div data-testid="no-active-system" />',
        },
        PageHeader: { template: '<h1><slot /></h1>' },
        Message: { template: '<div data-testid="error"><slot /></div>' },
        RouterLinkButton: {
          props: ['to'],
          template: '<a :data-route="to.name"><slot /></a>',
        },
        EvidenceIndexView: {
          name: 'EvidenceIndexView',
          props: ['searchEndpoint', 'statusOverTimeEndpoint', 'sspId'],
          template: '<div data-testid="evidence" />',
        },
      },
    },
  });
}

function scopeWith(entries: unknown[]) {
  return { data: { data: { autoFilters: false, entries, exceptions: [] } } };
}

describe('This System > Evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sspId = 'ssp-1';
  });

  it('asks for an active system when none is selected', async () => {
    state.sspId = '';
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="no-active-system"]').exists()).toBe(
      true,
    );
    expect(state.get).not.toHaveBeenCalled();
  });

  it('lists in-scope evidence through the SSP scoped endpoints', async () => {
    state.get.mockResolvedValue(
      scopeWith([{ id: 'e-1', labels: [{ key: 'repo', value: 'a' }] }]),
    );
    const wrapper = mountView();
    await flushPromises();

    expect(state.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope',
    );
    const page = wrapper.findComponent({ name: 'EvidenceIndexView' });
    expect(page.props()).toEqual({
      searchEndpoint: '/api/oscal/system-security-plans/ssp-1/evidence/search',
      statusOverTimeEndpoint:
        '/api/oscal/system-security-plans/ssp-1/evidence/status-over-time',
      sspId: 'ssp-1',
    });
  });

  it('links to the Scope tab instead of listing evidence when the scope is empty', async () => {
    state.get.mockResolvedValue(scopeWith([]));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="evidence"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="empty-scope"]').exists()).toBe(true);
    expect(wrapper.find('a').attributes('data-route')).toBe('system:scope');
  });

  it('shows the error when the scope cannot be read', async () => {
    state.get.mockRejectedValue({
      response: { status: 500, data: { errors: { body: 'boom' } } },
    });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="error"]').text()).toBe('boom');
    expect(wrapper.find('[data-testid="evidence"]').exists()).toBe(false);
  });
});
