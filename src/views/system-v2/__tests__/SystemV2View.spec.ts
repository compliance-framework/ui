import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { sspSectionTabRoutes } from '@/constants/ssp-section-tabs';
import SystemV2View from '../SystemV2View.vue';

enableAutoUnmount(afterEach);

const systemStoreState = reactive({
  system: { securityPlan: null as { uuid: string } | null },
});

vi.mock('@/stores/system', () => ({
  useSystemStore: () => systemStoreState,
}));

const Child = defineComponent({
  name: 'SystemChildStub',
  render: () => h('div', { 'data-test': 'child' }, 'child view'),
});

async function mountAt(name: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/system',
        component: SystemV2View,
        // Every tab route the tab bar links to, each with a unique path.
        children: sspSectionTabRoutes('system:').map((tab) => ({
          path:
            tab.route === 'system:overview'
              ? ''
              : tab.route.slice('system:'.length),
          name: tab.route,
          component: Child,
        })),
      },
      {
        path: '/system-security-plans',
        name: 'system-security-plans',
        component: Child,
      },
    ],
  });
  await router.push({ name });
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe('SystemV2View', () => {
  it('gates every child behind the active SSP', async () => {
    systemStoreState.system.securityPlan = null;
    const wrapper = await mountAt('system:compliance');

    expect(wrapper.text()).toContain('No active system security plan');
    expect(wrapper.find('[data-test="child"]').exists()).toBe(false);
    const cta = wrapper
      .findAll('a')
      .find((a) => a.attributes('href')?.startsWith('/system-security-plans'));
    expect(cta?.attributes('href')).toContain('next=');
  });

  it('renders the tab bar and the child once an SSP is active', async () => {
    systemStoreState.system.securityPlan = { uuid: 'ssp-1' };
    const wrapper = await mountAt('system:compliance');

    expect(wrapper.text()).not.toContain('No active system security plan');
    expect(wrapper.find('nav').exists()).toBe(true);
    expect(wrapper.find('[data-test="child"]').exists()).toBe(true);
  });
});
