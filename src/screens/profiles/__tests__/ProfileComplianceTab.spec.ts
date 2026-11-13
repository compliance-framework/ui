import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ProfileComplianceTab from '../ProfileComplianceTab.vue';

const calls = vi.hoisted(() => [] as { url: string; config: unknown }[]);
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string, config: unknown) => {
    calls.push({ url, config });
    return {
      data: ref({
        summary: {
          totalControls: 2,
          satisfied: 1,
          notSatisfied: 1,
          unknown: 0,
          compliancePercent: 50,
          assessedPercent: 100,
        },
        groups: [],
        controls: [
          {
            controlId: 'ac-1',
            catalogId: 'c',
            title: 'Policy',
            groupTitle: 'Access',
            computedStatus: 'satisfied',
            statusCounts: [{ status: 'satisfied', count: 2 }],
          },
          {
            controlId: 'ac-2',
            catalogId: 'c',
            title: 'Accounts',
            groupTitle: 'Access',
            computedStatus: 'not-satisfied',
            statusCounts: [{ status: 'not-satisfied', count: 1 }],
          },
        ],
      }),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      execute: vi.fn(() => Promise.resolve()),
    };
  },
}));

describe('ProfileComplianceTab', () => {
  it('loads the profile’s progress with controls and shows totals and controls', async () => {
    setActivePinia(createPinia());
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/profiles/:id/compliance', component: ProfileComplianceTab },
      ],
    });
    await router.push('/profiles/p-1/compliance');
    await router.isReady();
    const wrapper = mount(
      defineComponent({
        render: () => h(TooltipProvider, null, () => h(ProfileComplianceTab)),
      }),
      { global: { plugins: [router] } },
    );
    await flushPromises();
    expect(calls[0]).toEqual({
      url: '/api/oscal/profiles/p-1/compliance-progress',
      config: { params: { includeControls: true } },
    });
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });
});
