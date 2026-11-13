import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import SystemScope from '../SystemScope.vue';

const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: api.get }),
}));

const Page = defineComponent({
  render: () => h('p', { class: 'page' }, 'page'),
});

async function mountScope(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/next/systems', name: 'ds-systems', component: Page },
      {
        path: '/next/systems/:systemId',
        component: SystemScope,
        children: [{ path: 'evidence', component: Page }],
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(defineComponent({ render: () => h(SystemScope) }), {
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

describe('SystemScope', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    api.get.mockReset();
  });

  it('makes the system in the URL the current system', async () => {
    api.get.mockResolvedValue({
      data: { data: { uuid: 'sys-b', metadata: { title: 'System B' } } },
    });
    const store = useSystemStore();
    store.setSecurityPlan({
      uuid: 'sys-a',
      metadata: { title: 'System A' },
    } as never);

    const { wrapper } = await mountScope('/next/systems/sys-b/evidence');

    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/sys-b',
    );
    expect(store.system.securityPlan?.uuid).toBe('sys-b');
    expect(wrapper.find('.page').exists()).toBe(true);
  });

  it('shows an unknown system in place, with a way back', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    const { wrapper } = await mountScope('/next/systems/nope/evidence');
    expect(wrapper.text()).toContain('System not found');
    expect(wrapper.find('.page').exists()).toBe(false);
    expect(useSystemStore().system.securityPlan).toBeUndefined();
  });

  it('shows forbidden when the user may not read the system', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    const { wrapper } = await mountScope('/next/systems/secret/evidence');
    expect(wrapper.text()).toContain("You don't have access to this system");
  });
});
