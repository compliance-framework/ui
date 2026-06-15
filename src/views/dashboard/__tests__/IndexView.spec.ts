import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowRef } from 'vue';
import type { Dashboard } from '@/stores/filters';
import type { SystemSecurityPlan } from '@/oscal';

const dashboards = shallowRef<Dashboard[]>([]);
const systemSecurityPlans = shallowRef<SystemSecurityPlan[]>([]);

const mocks = vi.hoisted(() => ({
  aiEnabled: false,
  fetchConfig: vi.fn(),
  routerPush: vi.fn(),
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
  refreshDashboards: vi.fn(),
  deleteDashboard: vi.fn(),
}));

vi.mock('@/stores/ai-config', () => ({
  useAiConfigStore: () => ({
    dashboardSuggestionsEnabled: mocks.aiEnabled,
    fetchDashboardSuggestionsConfig: mocks.fetchConfig,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mocks.confirmRequire }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: mocks.toastAdd }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string | null) => {
    if (url === '/api/filters') {
      return { data: dashboards, execute: mocks.refreshDashboards };
    }
    if (url === '/api/oscal/system-security-plans') {
      return { data: systemSecurityPlans };
    }
    if (url === null) {
      return { execute: mocks.deleteDashboard };
    }
    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
}));

vi.mock('@/views/dashboard/DashboardChart.vue', () => ({
  default: { name: 'DashboardChart', template: '<div />' },
}));

vi.mock('@/views/dashboard/CompliancePostureWidget.vue', () => ({
  default: { name: 'CompliancePostureWidget', template: '<div />' },
}));

import IndexView from '../IndexView.vue';

function makeDashboard(name: string, sspId: string | null = null): Dashboard {
  return {
    id: name,
    uuid: name,
    name,
    sspId,
    filter: {} as Dashboard['filter'],
    controls: [],
    components: [],
  };
}

function makeSsp(uuid: string, title: string): SystemSecurityPlan {
  return {
    uuid,
    metadata: { title } as SystemSecurityPlan['metadata'],
  } as SystemSecurityPlan;
}

function mountView() {
  return mount(IndexView, {
    global: {
      stubs: {
        PageHeader: { template: '<h1><slot /></h1>' },
        PageSubHeader: { template: '<p><slot /></p>' },
        PageCard: { template: '<section><slot /></section>' },
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Message: { template: '<div><slot /></div>' },
        PrimaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        Select: { template: '<select />' },
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
}

describe('Dashboard IndexView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.aiEnabled = false;
    dashboards.value = [];
    systemSecurityPlans.value = [];
  });

  it('hides the AI suggestions entry point when the config probe is disabled', () => {
    dashboards.value = [makeDashboard('Global dashboard')];
    const wrapper = mountView();

    expect(wrapper.text()).not.toContain('AI suggestions');
    expect(wrapper.text()).toContain('Global dashboard');
  });

  it('groups dashboards by global and owning SSP scopes', () => {
    mocks.aiEnabled = true;
    dashboards.value = [
      makeDashboard('Global dashboard'),
      makeDashboard('Scoped dashboard', 'ssp-1'),
    ];
    systemSecurityPlans.value = [makeSsp('ssp-1', 'Payments SSP')];

    const wrapper = mountView();

    expect(
      wrapper.find('[data-testid="dashboard-group-global"]').text(),
    ).toContain('Global');
    expect(
      wrapper.find('[data-testid="dashboard-group-ssp-1"]').text(),
    ).toContain('Payments SSP');
    expect(wrapper.text()).toContain('AI suggestions');
  });
});
