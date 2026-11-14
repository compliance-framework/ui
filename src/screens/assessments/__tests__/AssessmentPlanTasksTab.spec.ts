import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import AssessmentPlanTasksTab from '../AssessmentPlanTasksTab.vue';

const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      url.endsWith('/associated-activities')
        ? [{ activityUuid: 'act-1', subjects: [] }]
        : [
            {
              uuid: 't-1',
              type: 'action',
              title: 'Quarterly scan',
              description: 'Scan every host',
              timing: {
                withinDateRange: {
                  start: '2026-01-01T00:00:00Z',
                  end: '2026-03-31T00:00:00Z',
                },
              },
            },
          ],
    ),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('AssessmentPlanTasksTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.get.mockReset().mockResolvedValue({
      data: {
        data: {
          uuid: 'act-1',
          title: 'Run the scanner',
          description: '',
          steps: [
            { uuid: 's-1', title: 'Update signatures' },
            { uuid: 's-2', title: 'Scan', description: 'All subnets' },
          ],
        },
      },
    });
  });

  it('shows each task with its type and timing, and its activities and steps once opened', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/assessment-plans/:id', component: AssessmentPlanTasksTab },
      ],
    });
    await router.push('/assessment-plans/ap-1');
    await router.isReady();
    const wrapper = mount(
      defineComponent({
        render: () => h(TooltipProvider, null, () => h(AssessmentPlanTasksTab)),
      }),
      { global: { plugins: [router] }, attachTo: document.body },
    );
    await flushPromises();
    const disclosure = wrapper.findComponent(Disclosure);
    expect(disclosure.props('label')).toBe('Quarterly scan');
    disclosure.vm.$emit('update:open', true);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('action');
    expect(text).toContain('1 Jan 2026 to 31 Mar 2026');
    expect(api.get).toHaveBeenCalledWith('/api/oscal/activities/act-1');
    expect(text).toContain('Run the scanner');
    expect(wrapper.findAll('ol li').map((li) => li.text())).toEqual([
      'Update signatures',
      'ScanAll subnets',
    ]);
    wrapper.unmount();
  });
});
