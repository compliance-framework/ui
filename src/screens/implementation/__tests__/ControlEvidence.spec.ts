import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { Dashboard } from '@/stores/filters';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import ControlEvidence from '../ControlEvidence.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

const api = vi.hoisted(() => ({ put: vi.fn(async () => ({})) }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/screens/EvidenceCapsule.vue', () => ({
  default: { props: ['filterId', 'controlId'], template: '<i>pill</i>' },
}));

const scope = {
  scope: { condition: { label: 'a', operator: '=', value: 'b' } },
};
const linked = {
  id: 'f1',
  name: 'MFA enforced',
  filter: scope,
  controls: [
    { id: 'ac-2', title: 'Account Management' },
    { id: 'ia-2', title: 'Identification' },
  ],
  components: [],
} as unknown as Dashboard;
const following = {
  id: 'f2',
  name: 'Leavers',
  sspId: 'ssp-1',
  filter: { and: [] },
  scopeBase: scope,
  controls: [],
  components: [],
} as unknown as Dashboard;
const forComponents = {
  id: 'f3',
  name: 'Okta only',
  filter: scope,
  controls: [],
  components: [{ uuid: 'okta', title: 'Okta' }],
} as unknown as Dashboard;

function mountEvidence(denied?: string) {
  const reloadFilters = vi.fn(async () => undefined);
  const Host = defineComponent({
    setup() {
      provideControlTree({
        sspId: () => 'ssp-1',
        filters: () => [linked],
        allFilters: () => [linked, following, forComponents],
        reloadFilters,
        filterEditDenied: () => denied,
        newFilterLink: () => ({ name: 'dashboards.create' }),
      } as unknown as ControlTreeContext);
      return () => h(ControlEvidence, { controlId: 'ac-2' });
    },
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        Tooltip: { template: '<slot />' },
      },
    },
  });
  return { wrapper, reloadFilters };
}

describe('ControlEvidence', () => {
  it('shows each linked filter with its own pill, and unlinks one', async () => {
    const { wrapper, reloadFilters } = mountEvidence();
    expect(wrapper.text()).toContain('MFA enforced');
    await wrapper
      .get('button[aria-label="Unlink MFA enforced"]')
      .trigger('click');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith('/api/filters/f1', {
      ...linked,
      controls: ['ia-2'],
      components: [],
    });
    expect(reloadFilters).toHaveBeenCalled();
  });

  it("offers the plan's other filters, not those for components, and links one still following", async () => {
    api.put.mockClear();
    const { wrapper } = mountEvidence();
    // The search is behind a plus button, and closes once a filter is linked.
    expect(wrapper.findComponent(Combobox).exists()).toBe(false);
    await wrapper
      .get('button[aria-label="Link an evidence filter"]')
      .trigger('click');
    const combobox = wrapper.findComponent(Combobox);
    expect(combobox.props('options')).toEqual([
      { value: 'f2', label: 'Leavers' },
    ]);
    combobox.vm.$emit('update:modelValue', 'f2');
    await nextTick();
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith('/api/filters/f2', {
      ...following,
      filter: scope,
      followSspScope: true,
      controls: ['ac-2'],
      components: [],
    });
    expect(wrapper.findComponent(Combobox).exists()).toBe(false);
  });

  it("can't change the links without access to filters", () => {
    const { wrapper } = mountEvidence("Your access doesn't include it.");
    expect(
      wrapper.find('button[aria-label="Link an evidence filter"]').exists(),
    ).toBe(false);
    expect(
      wrapper.get('button[aria-label^="Unlink MFA enforced"]').attributes(),
    ).toHaveProperty('aria-disabled');
  });
});
