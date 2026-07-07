import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowRef } from 'vue';
import type { Dashboard } from '@/stores/filters';
import type { SystemSecurityPlan } from '@/oscal';

const dashboards = shallowRef<Dashboard[]>([]);
const systemSecurityPlans = shallowRef<SystemSecurityPlan[]>([]);

const mocks = vi.hoisted(() => ({
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
  refreshDashboards: vi.fn(),
  deleteDashboard: vi.fn(),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
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
  default: {
    name: 'DashboardChart',
    template: '<div class="dashboard-chart" />',
  },
}));

vi.mock('@/views/dashboard/partials/FilterEditModal.vue', () => ({
  default: {
    name: 'FilterEditModal',
    props: ['visible', 'dashboard'],
    template:
      '<div v-if="visible" class="edit-modal">{{ dashboard?.name }}</div>',
  },
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
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Message: { template: '<div><slot /></div>' },
        PrimaryButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
}

describe('Dashboard IndexView (Filters table)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboards.value = [];
    systemSecurityPlans.value = [];
  });

  it('renders a row per filter with its scope label', () => {
    dashboards.value = [
      makeDashboard('Global filter'),
      makeDashboard('Scoped filter', 'ssp-1'),
    ];
    systemSecurityPlans.value = [makeSsp('ssp-1', 'Payments SSP')];

    const wrapper = mountView();

    const globalRow = wrapper.find('[data-testid="filter-row-Global filter"]');
    const scopedRow = wrapper.find('[data-testid="filter-row-Scoped filter"]');
    expect(globalRow.text()).toContain('Global filter');
    expect(globalRow.text()).toContain('Global');
    expect(scopedRow.text()).toContain('Payments SSP');
  });

  it('shows the empty-state message when there are no filters', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain('No Filters Found');
  });

  it('loads the dashboard chart only when a row is expanded', async () => {
    dashboards.value = [makeDashboard('Global filter')];
    const wrapper = mountView();

    expect(wrapper.find('.dashboard-chart').exists()).toBe(false);

    await wrapper
      .find('[data-testid="filter-row-Global filter"]')
      .trigger('click');

    expect(
      wrapper.find('[data-testid="filter-chart-Global filter"]').exists(),
    ).toBe(true);
    expect(wrapper.find('.dashboard-chart').exists()).toBe(true);
  });

  it('opens the edit modal for the clicked filter', async () => {
    dashboards.value = [makeDashboard('Global filter')];
    const wrapper = mountView();

    expect(wrapper.find('.edit-modal').exists()).toBe(false);

    const editButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Edit');
    await editButton!.trigger('click');

    const modal = wrapper.find('.edit-modal');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('Global filter');
  });

  it('asks for confirmation before deleting a filter', async () => {
    dashboards.value = [makeDashboard('Global filter')];
    const wrapper = mountView();

    const deleteButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Delete');
    await deleteButton!.trigger('click');

    expect(mocks.confirmRequire).toHaveBeenCalledOnce();
    expect(mocks.confirmRequire.mock.calls[0][0].header).toBe('Delete Filter');
  });
});
