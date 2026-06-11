import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SystemSecurityPlanCreateView from '@/views/system-security-plans/SystemSecurityPlanCreateView.vue';
import SystemSecurityPlanListView from '@/views/system-security-plans/SystemSecurityPlanListView.vue';
import type { SystemSecurityPlan } from '@/oscal';

const push = vi.fn();
const setSecurityPlan = vi.fn();
const activePlan = ref<Pick<SystemSecurityPlan, 'uuid'> | null>({
  uuid: 'ssp-active',
});
const apiCalls: Array<{ url: string; execute: ReturnType<typeof vi.fn> }> = [];

vi.mock('vue-router', () => ({
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

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => data,
  useDataApi: (url = '') => {
    const data = ref<unknown>(
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
};

describe('System Security Plan views', () => {
  beforeEach(() => {
    apiCalls.length = 0;
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
});
