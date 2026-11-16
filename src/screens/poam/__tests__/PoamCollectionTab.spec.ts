import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import PoamCollectionTab from '../PoamCollectionTab.vue';

const DATA: Record<string, unknown[]> = {
  observations: [
    {
      uuid: 'o-1',
      title: 'Open port',
      description: 'Port 22 reachable',
      methods: ['TEST'],
      collected: '2026-11-01T10:00:00Z',
    },
  ],
  findings: [
    {
      uuid: 'f-1',
      title: 'SSH exposed',
      description: 'SSH open to the internet',
      target: {
        type: 'objective-id',
        targetId: 'ac-17_obj',
        status: { state: 'not-satisfied' },
      },
      relatedRisks: [{ riskUuid: 'r-1' }],
    },
  ],
};

const api = vi.hoisted(() => ({ delete: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(DATA[url.split('/').pop()!] ?? []),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountTab(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/plan-of-action-and-milestones/:id/:tab',
        component: PoamCollectionTab,
      },
    ],
  });
  await router.push(`/plan-of-action-and-milestones/p-1/${path}`);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(PoamCollectionTab)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('PoamCollectionTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.delete.mockReset().mockResolvedValue({});
  });

  it('shows observations with their tags and facts', async () => {
    const wrapper = await mountTab('observations');
    const disclosure = wrapper.findComponent(Disclosure);
    expect(disclosure.props('label')).toBe('Open port');
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    expect(wrapper.text()).toContain('1 method');
    expect(wrapper.text()).toContain('Port 22 reachable');
    expect(wrapper.text()).toContain('New observation');
    wrapper.unmount();
  });

  it('shows a finding’s target and status, and deletes it after confirmation', async () => {
    const wrapper = await mountTab('findings');
    const disclosure = wrapper.findComponent(Disclosure);
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    expect(wrapper.text()).toContain('not-satisfied');
    expect(wrapper.text()).toContain('objective-id: ac-17_obj');
    expect(wrapper.text()).toContain('1 related risk');

    const items = wrapper.findComponent(Menu).props('items') as MenuAction[];
    items.find((item) => item.label === 'Delete finding')!.onSelect!();
    await flushPromises();
    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props('open')).toBe(true);
    confirm.vm.$emit('confirm');
    await flushPromises();
    expect(api.delete).toHaveBeenCalledWith(
      '/api/oscal/plan-of-action-and-milestones/p-1/findings/f-1',
    );
    expect(wrapper.findComponent(Disclosure).exists()).toBe(false);
    wrapper.unmount();
  });
});
