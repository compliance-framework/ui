import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { SystemSecurityPlan } from '@/oscal';
import OverviewView from '../SystemSecurityPlanOverviewView.vue';
import ListView from '../SystemSecurityPlanListView.vue';

// The pages Active System lands on (backlog M1-10/M1-12): the active SSP's V2
// overview, or the library when no SSP is active.

const responses: Record<string, unknown> = {};
vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string | null) => {
    const data = shallowRef<unknown>(url ? responses[url] : undefined);
    return {
      data,
      error: ref(null),
      isLoading: ref(false),
      execute: vi.fn(async (next?: string) => {
        if (next) data.value = responses[next];
      }),
    };
  },
}));
vi.mock('@/composables/useProfileCompliance', () => ({
  useProfileCompliance: () => ({
    progress: ref(null),
    summary: ref(null),
    isLoading: ref(false),
    error: ref(null),
    loadCompliance: vi.fn(),
  }),
}));
vi.mock('@/components/system-security-plans/RiskOverviewSection.vue', () => ({
  default: { template: '<div />' },
}));
const systemStore = vi.hoisted(() => ({
  system: {} as { securityPlan?: { uuid: string } },
  setSecurityPlan: vi.fn(),
}));
vi.mock('@/stores/system', () => ({ useSystemStore: () => systemStore }));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const stub = { template: '<div />' };

async function mountAt(component: object, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ssp/:id', component: stub },
      {
        path: '/ssp/:id/compliance',
        name: 'system-security-plan-compliance',
        component: stub,
      },
      { path: '/library', name: 'system-security-plans', component: stub },
      { path: '/import', name: 'admin-import', component: stub },
      {
        path: '/create',
        name: 'system-security-plans-create',
        component: stub,
      },
      {
        path: '/ssp/:id/overview',
        name: 'system-security-plan-overview',
        component: stub,
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('Active System targets', () => {
  it('shows plan remarks and links to the full compliance view', async () => {
    responses['/api/oscal/system-security-plans/ssp-1/metadata'] = {
      title: 'SSP One',
      remarks: 'Reviewed quarterly.',
    };
    const wrapper = await mountAt(OverviewView, '/ssp/ssp-1');

    expect(wrapper.text()).toContain('PLAN REMARKS');
    expect(wrapper.text()).toContain('Reviewed quarterly.');
    const link = wrapper
      .findAll('a')
      .find((a) => a.text() === 'OPEN FULL COMPLIANCE VIEW');
    expect(link?.attributes('href')).toBe('/ssp/ssp-1/compliance');
  });

  it('asks you to pick an active SSP when sent from Active System', async () => {
    responses['/api/oscal/system-security-plans'] = [
      { uuid: 'ssp-1', metadata: { title: 'SSP One' } },
    ] as SystemSecurityPlan[];
    systemStore.system = {};
    const wrapper = await mountAt(ListView, '/library?next=/system');

    expect(wrapper.text()).toContain('Choose an active system');
  });

  it('shows no prompt on a plain library visit', async () => {
    const wrapper = await mountAt(ListView, '/library');

    expect(wrapper.text()).not.toContain('Choose an active system');
  });
});
