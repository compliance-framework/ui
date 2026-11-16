import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import type { SspTemplateInstance } from '@/types/ssp-templates';
import SspTemplateInstancesPanel from '../SspTemplateInstancesPanel.vue';

const state = vi.hoisted(() => ({
  instances: [] as SspTemplateInstance[],
  urls: [] as string[],
  configs: [] as unknown[],
  del: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string, config: unknown) => {
    state.urls.push(url);
    state.configs.push(config);
    return {
      data: ref(state.instances),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      response: ref(undefined),
      execute: vi.fn((next: string) => {
        state.urls.push(next);
        return Promise.resolve();
      }),
    };
  },
  useAuthenticatedInstance: () => ({ delete: state.del }),
}));
vi.mock('@/ds/toasts', () => ({
  useToast: () => ({ add: state.toast }),
}));

async function mountPanel(templateId = 't-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      {
        path: '/systems/:systemId/configure',
        name: 'system-configure',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/');
  const id = ref(templateId);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SspTemplateInstancesPanel, { templateId: id.value }),
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, id };
}

const rows = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('tbody tr');

describe('SspTemplateInstancesPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.urls.length = 0;
    state.configs.length = 0;
    state.del.mockResolvedValue({});
    state.instances = [
      {
        keyValues: { _app: 'payments', aws_account: '111' },
        sspId: 'ssp-1',
        title: 'SSP for payments',
        createdAt: '2026-10-19T10:00:00Z',
        lastSeenAt: '2026-10-19T09:58:00Z',
        stale: true,
        lastError: 'profile attach failed',
        skippedEntries: 2,
      },
      {
        keyValues: { _app: 'old' },
        keyHash: 'abc123',
        sspId: null,
        title: 'SSP for old',
        createdAt: '2026-10-01T10:00:00Z',
        lastSeenAt: '2026-10-02T10:00:00Z',
        stale: false,
        lastError: null,
        skippedEntries: 0,
      },
    ];
  });

  it('lists created systems with label keys kept verbatim', async () => {
    const { wrapper } = await mountPanel();
    expect(state.urls[0]).toBe('/api/admin/ssp-templates/t-1/ssps');
    expect(state.configs[0]).toEqual({
      camelcaseStopPaths: ['data.key-values'],
    });
    const [live, gone] = rows(wrapper);
    expect(live!.text()).toContain('_app=payments, aws_account=111');
    expect(live!.find('a[href="/systems/ssp-1/configure"]').exists()).toBe(
      true,
    );
    expect(live!.text()).toContain('Stale');
    expect(live!.text()).toContain('profile attach failed');
    expect(live!.text()).toContain('2 invalid values skipped');
    expect(live!.text()).not.toContain('Forget');
    expect(gone!.text()).toContain('SSP for old (deleted)');
    expect(gone!.text()).not.toContain('Stale');
    wrapper.unmount();
  });

  it('forgets a deleted system after confirmation, and reports a failure', async () => {
    const { wrapper } = await mountPanel();
    await rows(wrapper)[1]!.find('button').trigger('click');
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith(
      '/api/admin/ssp-templates/t-1/ssps/abc123',
    );

    state.del.mockRejectedValue(new Error('SSP still exists'));
    await rows(wrapper)[1]!.find('button').trigger('click');
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(state.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Forget failed',
        detail: 'SSP still exists',
      }),
    );
    wrapper.unmount();
  });

  it('cannot forget without the key hash', async () => {
    (state.instances[1] as { keyHash?: string }).keyHash = undefined;
    const { wrapper } = await mountPanel();
    expect(rows(wrapper)[1]!.find('button').attributes('aria-disabled')).toBe(
      'true',
    );
    wrapper.unmount();
  });

  it('reloads when the template changes', async () => {
    const { wrapper, id } = await mountPanel();
    id.value = 't-2';
    await nextTick();
    await flushPromises();
    expect(state.urls.at(-1)).toBe('/api/admin/ssp-templates/t-2/ssps');
    wrapper.unmount();
  });
});
