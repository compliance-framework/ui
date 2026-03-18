import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, shallowRef, toValue } from 'vue';
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
    pluginId: 'plugin-a',
    policyPackage: 'policy-a',
    name: 'template-risk',
    title: 'Template Risk',
    statement: 'Template statement from API',
    likelihoodHint: 'moderate',
    impactHint: 'high',
    violationIds: ['V-1', 'V-2'],
    threatIds: [
      {
        system: ' mitre ',
        id: ' TH-101 ',
        title: 'Threat 101',
        url: ' https://threats.local/101 ',
      },
      { system: ' mitre ', id: ' TH-202 ', title: 'Threat 202' },
    ],
    remediationTemplate: {
      title: 'Template remediation recommendation',
      description: 'Template remediation description',
      tasks: [{ title: 'Rotate keys', orderIndex: 0 }],
    },
  },
]);
const templatesLoading = ref(false);
const templatesError = ref(null);

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: unknown, config?: { method?: string }) => {
    const resolvedUrl = String(toValue(url as never) ?? '');

    if (resolvedUrl === '/api/admin/risk-templates') {
      return {
        data: riskTemplates,
        isLoading: templatesLoading,
        error: templatesError,
        execute: mockLoadTemplates,
      };
    }

    if (
      resolvedUrl.includes('/api/oscal/plan-of-action-and-milestones/') &&
      config?.method === 'POST'
    ) {
      return {
        data: returnedRisk,
        isLoading: createRiskLoading,
        execute: mockCreateRisk,
      };
    }

    throw new Error(`Unexpected useDataApi invocation: ${resolvedUrl}`);
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

import RiskCreateForm from '../risk/RiskCreateForm.vue';

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
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'template-risk',
        title: 'Template Risk',
        statement: 'Template statement from API',
        likelihoodHint: 'moderate',
        impactHint: 'high',
        violationIds: ['V-1', 'V-2'],
        threatIds: [
          {
            system: ' mitre ',
            id: ' TH-101 ',
            title: 'Threat 101',
            url: ' https://threats.local/101 ',
          },
          { system: ' mitre ', id: ' TH-202 ', title: 'Threat 202' },
        ],
        remediationTemplate: {
          title: 'Template remediation recommendation',
          description: 'Template remediation description',
          tasks: [{ title: 'Rotate keys', orderIndex: 0 }],
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

  const findButtonByText = (
    wrapper: ReturnType<typeof mount>,
    label: string,
  ) => {
    return wrapper.findAll('button').find((button) => button.text() === label);
  };

  it('applies selected template values to the risk form', async () => {
    const wrapper = mountForm();

    const useTemplateButton = findButtonByText(wrapper, 'Use Template');
    expect(useTemplateButton).toBeDefined();

    await useTemplateButton!.trigger('click');
    await Promise.resolve();

    const applyButton = findButtonByText(wrapper, 'Apply');

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
    const remediationTitleInput = wrapper.get(
      '[data-testid="suggested-remediation-title"]',
    );
    const remediationDescriptionInput = wrapper.get(
      '[data-testid="suggested-remediation-description"]',
    );
    const remediationTaskInput = wrapper.get(
      '[data-testid="suggested-remediation-task-0"]',
    );

    expect((titleInput.element as HTMLInputElement).value).toBe(
      'Template Risk',
    );
    expect((descriptionInput.element as HTMLTextAreaElement).value).toBe(
      'Template statement from API',
    );
    expect((statementInput.element as HTMLTextAreaElement).value).toBe(
      'Template statement from API',
    );
    expect((statusSelect.element as HTMLSelectElement).value).toBe('');
    expect((remediationTitleInput.element as HTMLInputElement).value).toBe(
      'Template remediation recommendation',
    );
    expect(
      (remediationDescriptionInput.element as HTMLTextAreaElement).value,
    ).toBe('Template remediation description');
    expect((remediationTaskInput.element as HTMLInputElement).value).toBe(
      'Rotate keys',
    );
    expect(wrapper.text()).toContain('Using template: Template Risk');
  });

  it('submits prefilled template values when creating a risk', async () => {
    const wrapper = mountForm();

    const useTemplateButton = findButtonByText(wrapper, 'Use Template');
    expect(useTemplateButton).toBeDefined();

    await useTemplateButton!.trigger('click');
    await Promise.resolve();

    const applyButton = findButtonByText(wrapper, 'Apply');

    await applyButton!.trigger('click');
    await wrapper.find('select').setValue('open');
    await wrapper.find('form').trigger('submit');

    expect(mockCreateRisk).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Template Risk',
        description: 'Template statement from API',
        statement: 'Template statement from API',
        status: 'open',
        threatIds: [
          {
            id: 'TH-101',
            system: 'mitre',
            href: 'https://threats.local/101',
          },
          { id: 'TH-202', system: 'mitre' },
        ],
        remediations: [
          expect.objectContaining({
            lifecycle: 'recommendation',
            title: 'Template remediation recommendation',
            description: 'Template remediation description',
            tasks: [
              expect.objectContaining({
                type: 'action',
                title: 'Rotate keys',
              }),
            ],
          }),
        ],
        deadline: undefined,
      }),
    });
  });

  it('renders manual status options without risk-accepted workflow state', () => {
    const wrapper = mountForm();

    expect(wrapper.find('option[value="open"]').exists()).toBe(true);
    expect(wrapper.find('option[value="investigating"]').exists()).toBe(true);
    expect(wrapper.find('option[value="mitigating-planned"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('option[value="mitigating-implemented"]').exists(),
    ).toBe(true);
    expect(wrapper.find('option[value="risk-accepted"]').exists()).toBe(false);
    expect(wrapper.find('option[value="closed"]').exists()).toBe(true);
  });

  it('handles 403 loading templates by disabling template selection', async () => {
    mockLoadTemplates.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403 },
    });

    const wrapper = mountForm();

    const useTemplateButton = findButtonByText(wrapper, 'Use Template');
    expect(useTemplateButton).toBeDefined();

    await useTemplateButton!.trigger('click');
    await Promise.resolve();

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Permission Denied',
      }),
    );

    const unavailableButton = findButtonByText(
      wrapper,
      'Templates Unavailable',
    );
    expect(unavailableButton).toBeDefined();
    expect(unavailableButton!.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain(
      'You do not have permission to use risk templates.',
    );
  });

  it('shows non-Axios error message when creation throws runtime error', async () => {
    mockCreateRisk.mockRejectedValueOnce(new Error('Runtime explode'));

    const wrapper = mountForm();

    await wrapper
      .find('input[placeholder="Enter risk title"]')
      .setValue('Risk A');
    await wrapper
      .find('textarea[placeholder="Enter risk description"]')
      .setValue('Description A');
    await wrapper
      .find('textarea[placeholder="Enter risk statement"]')
      .setValue('Statement A');
    await wrapper.find('select').setValue('open');

    await wrapper.find('form').trigger('submit');

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Creation Failed',
        detail: 'Failed to create risk: Runtime explode',
      }),
    );
  });
});
