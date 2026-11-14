import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import AssessmentResultsResultsTab from '../AssessmentResultsResultsTab.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), delete: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([
      {
        uuid: 'r-1',
        title: 'Q3 run',
        description: 'Quarterly',
        start: '2026-09-01T09:00:00Z',
        findings: [{ uuid: 'f-1', title: 'MFA missing' }],
        reviewedControls: { controlSelections: [] },
      },
    ]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountTab() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/assessment-results/:id',
        component: AssessmentResultsResultsTab,
      },
    ],
  });
  await router.push('/assessment-results/ar-1');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(AssessmentResultsResultsTab)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const button = (label: string) =>
  [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  )!;

describe('AssessmentResultsResultsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.post.mockReset().mockResolvedValue({
      data: {
        data: {
          uuid: 'r-2',
          title: 'Q4 run',
          start: '2026-12-01T09:00:00Z',
          reviewedControls: { controlSelections: [] },
        },
      },
    });
    api.delete.mockReset().mockResolvedValue({});
  });

  it('asks for a title, then adds a result that reviews all controls', async () => {
    const wrapper = await mountTab();
    button('New result').click();
    await flushPromises();
    button('Add result').click();
    await flushPromises();
    expect(document.body.textContent).toContain('Enter a title.');
    expect(api.post).not.toHaveBeenCalled();

    const title = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input',
    )!;
    title.value = 'Q4 run';
    title.dispatchEvent(new Event('input'));
    button('Add result').click();
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/assessment-results/ar-1/results',
      expect.objectContaining({
        title: 'Q4 run',
        reviewedControls: { controlSelections: [{ includeAll: {} }] },
      }),
      expect.anything(),
    );
    expect(wrapper.text()).toContain('Q4 run');
    wrapper.unmount();
  });

  it('deletes a result after confirmation', async () => {
    const wrapper = await mountTab();
    const items = wrapper.findComponent(Menu).props('items') as MenuAction[];
    items.find((i) => i.label === 'Delete result')!.onSelect!();
    await flushPromises();
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(api.delete).toHaveBeenCalledWith(
      '/api/oscal/assessment-results/ar-1/results/r-1',
    );
    expect(wrapper.text()).not.toContain('Q3 run');
    wrapper.unmount();
  });
});
