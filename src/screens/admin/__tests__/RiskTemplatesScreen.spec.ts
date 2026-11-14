import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import type { RiskTemplate } from '@/types/risk-templates';
import RiskTemplatesScreen from '../RiskTemplatesScreen.vue';

const state = vi.hoisted(() => ({
  templates: [] as RiskTemplate[],
  error: undefined as unknown,
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  put: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  del: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    post: state.post,
    put: state.put,
    delete: state.del,
  }),
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: () => ({
    data: ref(state.error ? undefined : state.templates),
    error: ref(state.error),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toast }),
}));

const base: RiskTemplate = {
  id: 'template-1',
  pluginId: 'plugin-a',
  policyPackage: 'policy-a',
  name: 'network-risk',
  title: 'Network Risk',
  statement: 'Network risk statement',
  usageCount: 3,
  createdAt: '2026-04-06T12:00:00Z',
};

async function mountScreen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/risk-templates', component: RiskTemplatesScreen }],
  });
  await router.push('/admin/risk-templates');
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(RouterView)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

async function choose(wrapper: ReturnType<typeof mount>, label: string) {
  await wrapper.find('button[aria-label^="Actions for"]').trigger('click');
  await flushPromises();
  const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
    el.textContent?.includes(label),
  ) as HTMLElement;
  item.click();
  await flushPromises();
  return item;
}

describe('RiskTemplatesScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.templates = [base];
    state.error = undefined;
    state.post.mockReset().mockResolvedValue({ data: { data: base } });
    state.del.mockReset().mockResolvedValue({});
    state.toast.mockReset();
  });

  it('lists templates with their hints, usage and creation date', async () => {
    const wrapper = await mountScreen();
    const row = wrapper.find('tbody tr').text();
    expect(row).toContain('Network Risk');
    expect(row).toContain('Not set / Not set');
    expect(row).toContain('3 risks');
    wrapper.unmount();
  });

  it('duplicates a template with the "(Copy)" suffix', async () => {
    const wrapper = await mountScreen();
    await choose(wrapper, 'Duplicate');
    expect(state.post.mock.calls[0]![0]).toBe('/api/admin/risk-templates');
    expect(state.post.mock.calls[0]![1]).toMatchObject({
      name: 'network-risk-copy',
      title: 'Network Risk (Copy)',
    });
    wrapper.unmount();
  });

  it("shows the API's reason when duplicating fails", async () => {
    state.post.mockRejectedValueOnce({
      response: { status: 409, data: { errors: { body: 'Name taken' } } },
    });
    const wrapper = await mountScreen();
    await choose(wrapper, 'Duplicate');
    expect(state.toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Name taken' }),
    );
    wrapper.unmount();
  });

  it('warns how many risks use a template before deleting it', async () => {
    const wrapper = await mountScreen();
    await choose(wrapper, 'Delete template');
    expect(document.body.textContent).toContain('3 risks use this template.');
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete template')!
      .click();
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith(
      '/api/admin/risk-templates/template-1',
    );
    wrapper.unmount();
  });

  it("won't edit or delete a template without an ID", async () => {
    state.templates = [{ ...base, id: undefined, uuid: undefined }];
    const wrapper = await mountScreen();
    await wrapper.find('button[aria-label^="Actions for"]').trigger('click');
    await flushPromises();
    const disabled = [...document.querySelectorAll('[role="menuitem"]')]
      .filter((el) => el.getAttribute('aria-disabled') === 'true')
      .map((el) => el.textContent ?? '');
    expect(disabled.some((t) => t.includes('Edit template'))).toBe(true);
    expect(disabled.some((t) => t.includes('Delete template'))).toBe(true);
    wrapper.unmount();
  });

  it('shows a forbidden state when the list answers 403', async () => {
    state.error = { response: { status: 403 } };
    const wrapper = await mountScreen();
    expect(wrapper.text()).not.toContain('Network Risk');
    expect(wrapper.find('tbody').exists()).toBe(false);
    wrapper.unmount();
  });
});
