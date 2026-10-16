import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    list: vi.fn().mockResolvedValue({ data: [] }),
    getSystemImplementationComponents: vi.fn().mockResolvedValue({ data: [] }),
  }),
}));

import LineageScopeBar from '../LineageScopeBar.vue';

const stubs = { Select: true, SelectButton: true };

describe('LineageScopeBar refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('emits refresh when the button is clicked', async () => {
    const wrapper = mount(LineageScopeBar, { global: { stubs } });
    await flushPromises();

    await wrapper.get('[data-testid="lineage-refresh"]').trigger('click');

    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('disables the button while refreshing', async () => {
    const wrapper = mount(LineageScopeBar, {
      props: { refreshing: true },
      global: { stubs },
    });
    await flushPromises();

    expect(
      wrapper.get('[data-testid="lineage-refresh"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('shows how old the data is only once it is known', async () => {
    const wrapper = mount(LineageScopeBar, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-testid="lineage-updated"]').exists()).toBe(
      false,
    );

    await wrapper.setProps({
      generatedAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    expect(wrapper.get('[data-testid="lineage-updated"]').text()).toBe(
      'Updated 5 minutes ago',
    );
  });
});
