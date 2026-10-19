import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import SystemSecurityPlanComplianceView from '../SystemSecurityPlanComplianceView.vue';

const { listProfiles } = vi.hoisted(() => ({ listProfiles: vi.fn() }));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({ listProfiles }),
}));

vi.mock('@/composables/useProfileCompliance', () => ({
  useProfileCompliance: () => ({
    summary: ref(null),
    controls: ref([]),
    groups: ref([]),
    isLoading: ref(false),
    error: ref(null),
    progress: ref(null),
    loadCompliance: vi.fn(),
  }),
}));

const RouterLinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="attach-link"><slot /></a>',
};

async function mountWithoutProfiles(props: Record<string, unknown>) {
  const wrapper = mount(SystemSecurityPlanComplianceView, {
    props: { sspId: 'ssp-1', ...props },
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        PageHeader: { template: '<h1><slot /></h1>' },
        ComplianceProgressPanel: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('SystemSecurityPlanComplianceView', () => {
  beforeEach(() => {
    listProfiles.mockReset();
    listProfiles.mockResolvedValue({ data: [] });
  });

  it('sends the active system to Implementation to attach a profile', async () => {
    const wrapper = await mountWithoutProfiles({
      attachProfileRouteName: 'controls:index',
    });

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props('to')).toEqual({ name: 'controls:index' });
    expect(link.text()).toBe('Implementation');
  });

  it("sends the SSP Editor to the plan's Overview to attach a profile", async () => {
    const wrapper = await mountWithoutProfiles({});

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props('to')).toEqual({
      name: 'system-security-plan-overview',
      params: { id: 'ssp-1' },
    });
    expect(link.text()).toBe('Overview');
  });
});
