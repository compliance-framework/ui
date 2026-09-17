import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import SystemSecurityPlanCreateView from '@/views/system-security-plans/SystemSecurityPlanCreateView.vue';
import SystemSecurityPlanListView from '@/views/system-security-plans/SystemSecurityPlanListView.vue';
import SystemSecurityPlanSystemImplementationEditorView from '@/views/system-security-plans/SystemSecurityPlanSystemImplementationEditorView.vue';
import type { SystemSecurityPlan } from '@/oscal';

const push = vi.fn();
const setSecurityPlan = vi.fn();
const activePlan = ref<Pick<SystemSecurityPlan, 'uuid'> | null>({
  uuid: 'ssp-active',
});
const apiCalls: Array<{ url: string; execute: ReturnType<typeof vi.fn> }> = [];
const apiData = new Map<string, ReturnType<typeof ref<unknown>>>();

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  useRoute: () => ({ params: { id: 'ssp-active' } }),
  useRouter: () => ({ push }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: { securityPlan: activePlan.value },
    setSecurityPlan,
  }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: vi.fn(),
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => data,
  useDataApi: (url = '') => {
    const data =
      apiData.get(String(url)) ??
      ref<unknown>(
        url === '/api/oscal/system-security-plans'
          ? [
              {
                uuid: 'ssp-active',
                metadata: { title: 'Active SSP', version: '1.0.0' },
              },
              {
                uuid: 'ssp-inactive',
                metadata: { title: 'Inactive SSP', version: '1.0.0' },
              },
            ]
          : undefined,
      );
    const execute = vi.fn(async () => ({
      data: (() => {
        const created = {
          uuid: 'created-ssp',
          metadata: { title: 'Created SSP', version: '1.0.0' },
        };
        data.value = created;
        return {
          value: {
            data: created,
          },
        };
      })(),
    }));
    apiCalls.push({ url: String(url), execute });
    return {
      data,
      execute,
      isLoading: ref(false),
      error: ref(null),
    };
  },
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

const stubs = {
  PageHeader: { template: '<h1><slot /></h1>' },
  PageSubHeader: { template: '<p><slot /></p>' },
  PageCard: { template: '<section><slot /></section>' },
  RouterLinkButton: { props: ['to'], template: '<a><slot /></a>' },
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  Badge: {
    props: ['value'],
    template:
      "<span :data-testid=\"value === 'Active' ? 'active-badge' : 'badge'\">{{ value }}<slot /></span>",
  },
  Label: {
    props: ['for', 'required'],
    template: '<label :for="$props.for"><slot /></label>',
  },
  InputText: {
    props: ['id', 'modelValue', 'invalid', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Message: { template: '<div role="alert"><slot /></div>' },
  PrimaryButton: {
    props: ['type', 'disabled'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  SecondaryButton: {
    props: ['type', 'disabled'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  TertiaryButton: {
    props: ['type', 'disabled'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  Tabs: { template: '<div><slot /></div>' },
  TabList: { template: '<div><slot /></div>' },
  Tab: { props: ['value'], template: '<button><slot /></button>' },
  TabPanels: { template: '<div><slot /></div>' },
  TabPanel: { props: ['value'], template: '<section><slot /></section>' },
  Dialog: { template: '<div><slot /></div>' },
  CollapsableGroup: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  SystemImplementationOverviewForm: {
    name: 'SystemImplementationOverviewForm',
    props: ['sspId', 'systemImplementation'],
    emits: ['saved'],
    template: '<div />',
  },
  SystemImplementationUserCreateForm: {
    name: 'SystemImplementationUserCreateForm',
    emits: ['created', 'cancel'],
    template: '<div />',
  },
  SystemImplementationUserEditForm: {
    name: 'SystemImplementationUserEditForm',
    props: ['user'],
    emits: ['saved', 'cancel'],
    template: '<div />',
  },
  SystemImplementationComponentCreateForm: {
    name: 'SystemImplementationComponentCreateForm',
    emits: ['created', 'cancel'],
    template: '<div />',
  },
  SystemImplementationComponentEditForm: {
    name: 'SystemImplementationComponentEditForm',
    props: ['component'],
    emits: ['saved', 'cancel'],
    template: '<div />',
  },
  SystemImplementationLeveragedAuthorizationCreateForm: {
    name: 'SystemImplementationLeveragedAuthorizationCreateForm',
    emits: ['created', 'cancel'],
    template: '<div />',
  },
  SystemImplementationLeveragedAuthorizationEditForm: {
    name: 'SystemImplementationLeveragedAuthorizationEditForm',
    props: ['auth'],
    emits: ['saved', 'cancel'],
    template: '<div />',
  },
};

describe('System Security Plan views', () => {
  beforeEach(() => {
    apiCalls.length = 0;
    apiData.clear();
    vi.clearAllMocks();
  });

  it('blocks create submit with a missing title and does not call the API', async () => {
    const wrapper = mount(SystemSecurityPlanCreateView, {
      global: { stubs },
    });

    await wrapper.find('#ssp-title').setValue('');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.text()).toContain('Title is required');
    const createCall = apiCalls.find(
      (apiCall) => apiCall.url === '/api/oscal/system-security-plans',
    );
    expect(createCall).toBeDefined();
    expect(createCall?.execute).not.toHaveBeenCalled();
  });

  it('creates an SSP through the existing endpoint when required fields are valid', async () => {
    const wrapper = mount(SystemSecurityPlanCreateView, {
      global: { stubs },
    });

    await wrapper.find('#ssp-title').setValue('New SSP');
    await wrapper.find('form').trigger('submit.prevent');

    const createCall = apiCalls.find(
      (apiCall) => apiCall.url === '/api/oscal/system-security-plans',
    );
    expect(createCall?.execute).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ title: 'New SSP' }),
      }),
    });
    expect(push).toHaveBeenCalledWith({
      name: 'system-security-plan-editor',
      params: { id: 'created-ssp' },
    });
  });

  it('renders the list create button, active badge, and only inactive Set Active action', () => {
    const wrapper = mount(SystemSecurityPlanListView, {
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Manage OSCAL System Security Plans');
    expect(wrapper.text()).toContain('New System Security Plan');
    expect(wrapper.findAll('[data-testid="active-badge"]')).toHaveLength(1);
    expect(
      wrapper
        .findAll('button')
        .filter((button) => button.text() === 'Set Active'),
    ).toHaveLength(1);
  });

  it('passes fetched system implementation data through to the overview form and updates it on save', async () => {
    const systemImplementation = ref<unknown>({ remarks: 'Original remarks' });
    apiData.set(
      '/api/oscal/system-security-plans/ssp-active/system-implementation',
      systemImplementation,
    );

    const wrapper = mount(SystemSecurityPlanSystemImplementationEditorView, {
      global: { stubs },
    });

    expect(
      wrapper
        .findComponent({ name: 'SystemImplementationOverviewForm' })
        .props('systemImplementation'),
    ).toEqual({ remarks: 'Original remarks' });

    wrapper
      .findComponent({ name: 'SystemImplementationOverviewForm' })
      .vm.$emit('saved', { remarks: 'Updated remarks' });
    await nextTick();

    expect(systemImplementation.value).toEqual({ remarks: 'Updated remarks' });
  });
});
