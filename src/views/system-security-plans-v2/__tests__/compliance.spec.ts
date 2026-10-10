import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import ComplianceView from '../SystemSecurityPlanComplianceView.vue';
import { sspDetailProfileBindingKey } from '../sspDetailProfileBinding';

const loadCompliance = vi.fn();
vi.mock('@/composables/useProfileCompliance', () => ({
  useProfileCompliance: () => ({
    progress: ref({
      scope: { id: 'p-1' },
      implementation: {
        implementedControls: 0,
        unimplementedControls: 10,
        implementationPercent: 0,
      },
    }),
    summary: ref({
      totalControls: 10,
      satisfied: 2,
      inherited: 6,
      notSatisfied: 1,
      unknown: 1,
      compliancePercent: 80,
      assessedPercent: 90,
    }),
    controls: ref([
      {
        catalogId: 'catalog',
        controlId: 'ac-1',
        title: 'Access Control',
        computedStatus: 'inherited',
        statusCounts: [],
      },
    ]),
    groups: ref([]),
    isLoading: ref(false),
    error: ref(null),
    loadCompliance,
  }),
}));

describe('remake compliance posture', () => {
  it('shows inherited compliance credit and loads results scoped to the SSP', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/ssp/:id', component: { template: '<div />' } }],
    });
    await router.push('/ssp/ssp-1');
    await router.isReady();
    const wrapper = mount(ComplianceView, {
      global: {
        plugins: [router],
        provide: {
          [sspDetailProfileBindingKey as symbol]: {
            profileResolved: ref(true),
            selectedProfileId: ref('p-1'),
          },
        },
      },
    });
    await flushPromises();
    expect(loadCompliance).toHaveBeenCalledWith({
      includeControls: true,
      sspId: 'ssp-1',
    });
    expect(wrapper.text()).toContain('INHERITED');
    expect(wrapper.find('.bg-purple-500').attributes('style')).toContain(
      'width: 60%',
    );
    expect(wrapper.find('.border-purple-300').text()).toContain('INHERITED');
    wrapper.unmount();
  });
});
