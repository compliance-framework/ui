import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { Dashboard } from '@/stores/filters';
import DashboardSavedViewCardV2 from '../DashboardSavedViewCardV2.vue';

enableAutoUnmount(afterEach);

const dashboard = {
  id: 'f-1',
  name: 'AWS access',
  filter: {},
  controls: undefined,
  components: undefined,
} as unknown as Dashboard;

function mountCard(props: Record<string, unknown> = {}) {
  return mount(DashboardSavedViewCardV2, {
    props: { dashboard, ...props },
    global: {
      stubs: { DashboardMiniStatusChartV2: true },
      directives: { tooltip: {} },
    },
  });
}

describe('DashboardSavedViewCardV2', () => {
  it('renders a filter without controls or components', () => {
    expect(mountCard().text()).toContain('AWS access');
  });

  it('emits edit and delete', async () => {
    const wrapper = mountCard();
    await wrapper.find('[aria-label="Edit AWS access"]').trigger('click');
    await wrapper.find('[aria-label="Delete AWS access"]').trigger('click');

    expect(wrapper.emitted('edit')).toHaveLength(1);
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });

  it('disables actions the user is not permitted to take', () => {
    const wrapper = mountCard({ canEdit: false, canDelete: false });

    expect(
      wrapper.find('[aria-label="Edit AWS access"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[aria-label="Delete AWS access"]').attributes('disabled'),
    ).toBeDefined();
  });
});
