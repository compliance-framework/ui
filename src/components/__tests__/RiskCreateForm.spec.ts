import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const mockCreateRisk = vi.fn().mockResolvedValue({});
const mockLoadTemplates = vi.fn().mockResolvedValue({});
const toastAdd = vi.fn();

const returnedRisk = shallowRef({
  uuid: 'risk-1',
  title: 'Created Risk',
  description: 'Created description',
  statement: 'Created statement',
  status: 'open',
});
const createRiskLoading = ref(false);

const riskTemplates = shallowRef([
  {
    id: 'template-1',
    title: 'Template Risk',
    description: 'Template description',
    defaultStatus: 'investigating',
    defaultLikelihood: 'moderate',
    defaultImpact: 'high',
    suggestedControls: ['AC-2', 'AU-6'],
    suggestedComponents: ['API Gateway'],
    metadata: {
      statement: 'Template statement from metadata',
      threatIds: ['TH-101', 'TH-202'],
    },
  },
]);
const templatesLoading = ref(false);
const templatesError = ref(null);

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string, config?: { method?: string }) => {
    if (url === '/api/admin/risk-templates') {
      return {
        data: riskTemplates,
        isLoading: templatesLoading,
        error: templatesError,
        execute: mockLoadTemplates,
      };
    }

    if (
      typeof url === 'string' &&
      url.includes('/api/oscal/plan-of-action-and-milestones/') &&
      config?.method === 'POST'
    ) {
      return {
        data: returnedRisk,
        isLoading: createRiskLoading,
        execute: mockCreateRisk,
      };
    }

    throw new Error(`Unexpected useDataApi invocation: ${url}`);
  },
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
    remove: vi.fn(),
  }),
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    template: '<div v-if="visible" class="dialog"><slot /></div>',
    props: ['visible', 'size', 'modal', 'header'],
  },
}));

import RiskCreateForm from '../poam/RiskCreateForm.vue';

describe('RiskCreateForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    returnedRisk.value = {
      uuid: 'risk-1',
      title: 'Created Risk',
      description: 'Created description',
      statement: 'Created statement',
      status: 'open',
    };
    riskTemplates.value = [
      {
        id: 'template-1',
        title: 'Template Risk',
        description: 'Template description',
        defaultStatus: 'investigating',
        defaultLikelihood: 'moderate',
        defaultImpact: 'high',
        suggestedControls: ['AC-2', 'AU-6'],
        suggestedComponents: ['API Gateway'],
        metadata: {
          statement: 'Template statement from metadata',
          threatIds: ['TH-101', 'TH-202'],
        },
      },
    ];
    createRiskLoading.value = false;
    templatesLoading.value = false;
    templatesError.value = null;
  });

  const mountForm = () => {
    return mount(RiskCreateForm, {
      props: {
        poamId: 'poam-1',
      },
    });
  };

  it('applies selected template values to the risk form', async () => {
    const wrapper = mountForm();

    await wrapper.find('button').trigger('click');
    await Promise.resolve();

    const applyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Apply');

    expect(applyButton).toBeDefined();

    await applyButton!.trigger('click');

    const titleInput = wrapper.find('input[placeholder="Enter risk title"]');
    const descriptionInput = wrapper.find(
      'textarea[placeholder="Enter risk description"]',
    );
    const statementInput = wrapper.find(
      'textarea[placeholder="Enter risk statement"]',
    );
    const statusSelect = wrapper.find('select');

    expect((titleInput.element as HTMLInputElement).value).toBe(
      'Template Risk',
    );
    expect((descriptionInput.element as HTMLTextAreaElement).value).toBe(
      'Template description',
    );
    expect((statementInput.element as HTMLTextAreaElement).value).toBe(
      'Template statement from metadata',
    );
    expect((statusSelect.element as HTMLSelectElement).value).toBe(
      'investigating',
    );
    expect(wrapper.text()).toContain('Using template: Template Risk');
  });

  it('submits prefilled template values when creating a risk', async () => {
    const wrapper = mountForm();

    await wrapper.find('button').trigger('click');
    await Promise.resolve();

    const applyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Apply');

    await applyButton!.trigger('click');
    await wrapper.find('form').trigger('submit');

    expect(mockCreateRisk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Template Risk',
        description: 'Template description',
        statement: 'Template statement from metadata',
        status: 'investigating',
        deadline: undefined,
      }),
    });
  });
});
