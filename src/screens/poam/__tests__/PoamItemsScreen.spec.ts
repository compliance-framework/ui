import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import PoamItemsScreen from '../PoamItemsScreen.vue';

const responses = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(responses.value[url]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

async function mountScreen(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/poam-items', component: PoamItemsScreen }],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(PoamItemsScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('PoamItemsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    responses.value = {
      '/api/poam-items': [
        {
          id: 'p1',
          sspId: 's1',
          title: 'Old item',
          status: 'completed',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'p2',
          sspId: 's2',
          title: 'New item',
          status: 'open',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ],
      '/api/oscal/system-security-plans': [
        { uuid: 's1', metadata: { title: 'Portal' } },
        { uuid: 's2', metadata: { title: 'Payments' } },
      ],
    };
  });

  it('lists the most recently updated first, with each system', async () => {
    const rows = (await mountScreen('/poam-items')).findAll('tbody tr');
    expect(rows[0]!.text()).toContain('New item');
    expect(rows[0]!.text()).toContain('Payments');
    expect(rows[1]!.text()).toContain('Completed');
  });

  it('filters by system and status from the URL', async () => {
    const wrapper = await mountScreen('/poam-items?system=s1&status=completed');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('System: Portal');
    expect(wrapper.text()).toContain('Status: Completed');
  });
});
