import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import DashboardSavedViewsSectionV2 from '../DashboardSavedViewsSectionV2.vue';
import type { Dashboard } from '@/stores/filters';

const mockToastAdd = vi.fn();
const mockConfirmRequire = vi.fn();
const mockUseDataApi = vi.fn();

vi.mock('@/composables/axios', () => ({
  useDataApi: (...args: unknown[]) => mockUseDataApi(...args),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

const mockCan = vi.fn((..._args: string[]) => true);
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (...args: string[]) => mockCan(...args),
    permissionTooltip: () => 'You do not have permission',
  }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: mockConfirmRequire,
  }),
}));

interface ApiMock<T> {
  data: ReturnType<typeof shallowRef<T | undefined>>;
  error: ReturnType<typeof ref<unknown>>;
  isLoading: ReturnType<typeof ref<boolean>>;
  execute: ReturnType<typeof vi.fn>;
}

function createApiMock<T>(initialData?: T): ApiMock<T> {
  return {
    data: shallowRef(initialData),
    error: ref(null),
    isLoading: ref(false),
    execute: vi.fn(),
  };
}

function createDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 'dashboard-1',
    uuid: 'dashboard-uuid-1',
    name: 'Demo SAT CCC.AuditLog.C01',
    filter: {} as Dashboard['filter'],
    controls: [
      {
        id: 'CCC.AuditLog.C01',
        title: 'Audit log control',
      } as Dashboard['controls'][number],
    ],
    components: [],
    ...overrides,
  };
}

function mountComponent() {
  return mount(DashboardSavedViewsSectionV2, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
        V2StatePanel: {
          props: ['title', 'description'],
          template:
            '<div><p>{{ title }}</p><p>{{ description }}</p><slot name="actions" /></div>',
        },
        DashboardSavedViewCardV2: {
          name: 'DashboardSavedViewCardV2',
          props: ['dashboard', 'deleting', 'canEdit', 'canDelete'],
          emits: ['delete', 'edit'],
          template:
            '<div><button class="emit-delete" @click="$emit(\'delete\', dashboard)">{{ dashboard.name }}</button><button class="emit-edit" @click="$emit(\'edit\', dashboard)">edit</button></div>',
        },
        FilterEditModal: {
          name: 'FilterEditModal',
          props: ['visible', 'dashboard'],
          emits: ['saved', 'update:visible'],
          template: '<div class="edit-modal" />',
        },
      },
    },
  });
}

describe('DashboardSavedViewsSectionV2', () => {
  let listApi: ApiMock<Dashboard[]>;
  let deleteApi: ApiMock<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCan.mockImplementation(() => true);

    listApi = createApiMock<Dashboard[]>([createDashboard()]);
    deleteApi = createApiMock<void>();

    mockUseDataApi.mockReset();
    mockUseDataApi.mockImplementationOnce(() => listApi);
    mockUseDataApi.mockImplementationOnce(() => deleteApi);
  });

  it('renders dashboard cards when dashboards are available', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('EVIDENCE FILTERS');
    expect(wrapper.text()).toContain('Demo SAT CCC.AuditLog.C01');
  });

  it('shows the empty state when no dashboards exist', async () => {
    listApi.data.value = [];

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('No evidence filters available');
    expect(wrapper.text()).toContain('GO TO EVIDENCE');
  });

  it('deletes a dashboard after confirm accept and refreshes the list', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('button.emit-delete').trigger('click');

    expect(mockConfirmRequire).toHaveBeenCalledTimes(1);

    const confirmConfig = mockConfirmRequire.mock.calls[0][0] as {
      accept: () => Promise<void>;
    };

    await confirmConfig.accept();
    await flushPromises();

    expect(deleteApi.execute).toHaveBeenCalledWith('/api/filters/dashboard-1');
    expect(listApi.execute).toHaveBeenCalledWith('/api/filters');
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Evidence Filter Deleted',
      }),
    );
  });

  it('opens the edit dialog for a card and refreshes after saving', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('button.emit-edit').trigger('click');
    const modal = wrapper.findComponent({ name: 'FilterEditModal' });
    expect(modal.props('visible')).toBe(true);
    expect(modal.props('dashboard')).toMatchObject({ id: 'dashboard-1' });

    modal.vm.$emit('saved');
    await flushPromises();
    expect(listApi.execute).toHaveBeenCalledWith('/api/filters');
  });

  it('offers Create and enables card actions with FILTER permissions', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('a').text()).toBe('CREATE');
    const card = wrapper.findComponent({ name: 'DashboardSavedViewCardV2' });
    expect(card.props()).toMatchObject({ canEdit: true, canDelete: true });
  });

  it('disables Create, Edit and Delete without FILTER permissions', async () => {
    mockCan.mockImplementation(() => false);
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('[aria-disabled="true"]').text()).toBe('CREATE');
    const card = wrapper.findComponent({ name: 'DashboardSavedViewCardV2' });
    expect(card.props()).toMatchObject({ canEdit: false, canDelete: false });
  });
});
