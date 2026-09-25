import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowRef } from 'vue';
import type { Dashboard } from '@/stores/filters';
import type { Control, SystemComponent, SystemSecurityPlan } from '@/oscal';

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

function makeDashboard(
  name: string,
  sspId: string | null = null,
  overrides: Partial<Pick<Dashboard, 'controls' | 'components'>> = {},
): Dashboard {
  return {
    id: name,
    uuid: name,
    name,
    sspId,
    filter: {} as Dashboard['filter'],
    controls: [],
    components: [],
    ...overrides,
  };
}

function makeSsp(uuid: string, title: string): SystemSecurityPlan {
  return {
    uuid,
    metadata: { title } as SystemSecurityPlan['metadata'],
  } as SystemSecurityPlan;
}

function makeControl(id: string, title: string): Control {
  return { id, title } as Control;
}

function makeComponent(uuid: string, title: string): SystemComponent {
  return { uuid, title } as SystemComponent;
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
        // A native <select> would coerce the `null` (Global) option's value to the
        // string "null" on round-trip; emit the real option value instead via buttons.
        // There are three Select instances on the page (scope/control/component), so
        // options are keyed by the select's own id to keep them distinguishable.
        Select: {
          props: ['id', 'modelValue', 'options'],
          emits: ['update:modelValue'],
          template: `<div>
            <button
              v-for="option in options"
              :key="String(option.value)"
              :data-testid="id + '-option-' + String(option.value)"
              @click="$emit('update:modelValue', option.value)"
            >{{ option.label }}</button>
          </div>`,
        },
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

  it('filters the filter list by scope', async () => {
    dashboards.value = [
      makeDashboard('Global filter'),
      makeDashboard('Payments filter', 'ssp-1'),
      makeDashboard('Billing filter', 'ssp-2'),
    ];
    systemSecurityPlans.value = [
      makeSsp('ssp-1', 'Payments SSP'),
      makeSsp('ssp-2', 'Billing SSP'),
    ];

    const wrapper = mountView();

    // Defaults to showing every filter, regardless of scope.
    expect(
      wrapper.find('[data-testid="filter-row-Global filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Payments filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Billing filter"]').exists(),
    ).toBe(true);

    // Selecting "Global" shows only unscoped filters.
    await wrapper
      .find('[data-testid="scope-filter-option-null"]')
      .trigger('click');
    expect(
      wrapper.find('[data-testid="filter-row-Global filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Payments filter"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="filter-row-Billing filter"]').exists(),
    ).toBe(false);

    // Selecting a specific SSP shows only that SSP's filters.
    await wrapper
      .find('[data-testid="scope-filter-option-ssp-1"]')
      .trigger('click');
    expect(
      wrapper.find('[data-testid="filter-row-Global filter"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="filter-row-Payments filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Billing filter"]').exists(),
    ).toBe(false);

    // Selecting "All Scopes" again restores every filter.
    await wrapper
      .find('[data-testid="scope-filter-option-all"]')
      .trigger('click');
    expect(
      wrapper.find('[data-testid="filter-row-Global filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Payments filter"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="filter-row-Billing filter"]').exists(),
    ).toBe(true);
  });

  it('shows a distinct message when filters exist but none match the selected scope', async () => {
    dashboards.value = [makeDashboard('Global filter')];
    systemSecurityPlans.value = [makeSsp('ssp-1', 'Payments SSP')];

    const wrapper = mountView();
    await wrapper
      .find('[data-testid="scope-filter-option-ssp-1"]')
      .trigger('click');

    expect(wrapper.text()).toContain('No Filters Match These Filters');
    expect(wrapper.text()).not.toContain('No Filters Found');
    expect(
      wrapper.find('[data-testid="filter-row-Global filter"]').exists(),
    ).toBe(false);
  });

  it('filters the filter list by control', async () => {
    dashboards.value = [
      makeDashboard('AC filter', null, {
        controls: [makeControl('AC-1', 'Access Control Policy')],
      }),
      makeDashboard('AU filter', null, {
        controls: [makeControl('AU-1', 'Audit Policy')],
      }),
      makeDashboard('No controls filter'),
    ];

    const wrapper = mountView();

    expect(
      wrapper.find('[data-testid="control-filter-option-AC-1"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="control-filter-option-AU-1"]').exists(),
    ).toBe(true);

    await wrapper
      .find('[data-testid="control-filter-option-AC-1"]')
      .trigger('click');

    expect(wrapper.find('[data-testid="filter-row-AC filter"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="filter-row-AU filter"]').exists()).toBe(
      false,
    );
    expect(
      wrapper.find('[data-testid="filter-row-No controls filter"]').exists(),
    ).toBe(false);

    await wrapper
      .find('[data-testid="control-filter-option-all"]')
      .trigger('click');

    expect(wrapper.find('[data-testid="filter-row-AC filter"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="filter-row-AU filter"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('[data-testid="filter-row-No controls filter"]').exists(),
    ).toBe(true);
  });

  it('filters the filter list by component', async () => {
    dashboards.value = [
      makeDashboard('API filter', null, {
        components: [makeComponent('comp-api', 'API Gateway')],
      }),
      makeDashboard('DB filter', null, {
        components: [makeComponent('comp-db', 'Database')],
      }),
    ];

    const wrapper = mountView();

    await wrapper
      .find('[data-testid="component-filter-option-comp-db"]')
      .trigger('click');

    expect(wrapper.find('[data-testid="filter-row-API filter"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="filter-row-DB filter"]').exists()).toBe(
      true,
    );
  });

  it('combines scope, control, and component filters', async () => {
    dashboards.value = [
      makeDashboard('Match', 'ssp-1', {
        controls: [makeControl('AC-1', 'Access Control Policy')],
        components: [makeComponent('comp-api', 'API Gateway')],
      }),
      makeDashboard('Wrong scope', 'ssp-2', {
        controls: [makeControl('AC-1', 'Access Control Policy')],
        components: [makeComponent('comp-api', 'API Gateway')],
      }),
      makeDashboard('Wrong control', 'ssp-1', {
        controls: [makeControl('AU-1', 'Audit Policy')],
        components: [makeComponent('comp-api', 'API Gateway')],
      }),
    ];
    systemSecurityPlans.value = [
      makeSsp('ssp-1', 'Payments SSP'),
      makeSsp('ssp-2', 'Billing SSP'),
    ];

    const wrapper = mountView();

    await wrapper
      .find('[data-testid="scope-filter-option-ssp-1"]')
      .trigger('click');
    await wrapper
      .find('[data-testid="control-filter-option-AC-1"]')
      .trigger('click');
    await wrapper
      .find('[data-testid="component-filter-option-comp-api"]')
      .trigger('click');

    expect(wrapper.find('[data-testid="filter-row-Match"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('[data-testid="filter-row-Wrong scope"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="filter-row-Wrong control"]').exists(),
    ).toBe(false);
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
