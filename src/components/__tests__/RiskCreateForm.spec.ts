import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMWrapper, mount } from '@vue/test-utils';
import { TooltipProvider } from 'reka-ui';
import { defineComponent, h, ref, shallowRef, toValue } from 'vue';
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

  // The form sits in a TooltipProvider, as in the app; the template picker is a dialog that
  // renders in a portal, so buttons are looked up in the whole document.
  const mountForm = () => {
    document.body.innerHTML = '';
    return mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(RiskCreateForm, { poamId: 'poam-1' }),
          ),
      }),
      { attachTo: document.body },
    );
  };

  const findButtonByText = (
    wrapper: ReturnType<typeof mount>,
    label: string,
  ) => {
    void wrapper;
    // A disabled button also carries its reason, read out after its label.
    const button = [...document.querySelectorAll('button')].find((el) =>
      el.textContent?.trim().startsWith(label),
    );
    return button ? new DOMWrapper(button) : undefined;
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
    expect(wrapper.text()).toContain('Using template: Template Risk');
    expect(wrapper.text()).toContain(
      'Threats and remediations can be added after the risk is created, from the tabs on the risk page.',
    );
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
        likelihood: 'moderate',
        impact: 'high',
        deadline: undefined,
        threatIds: [
          {
            system: 'mitre',
            id: 'TH-101',
            title: 'Threat 101',
            url: 'https://threats.local/101',
          },
          {
            system: 'mitre',
            id: 'TH-202',
            title: 'Threat 202',
          },
        ],
        remediationTemplate: {
          title: 'Template remediation recommendation',
          description: 'Template remediation description',
          tasks: [{ title: 'Rotate keys', orderIndex: 1 }],
        },
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

    const unavailableButton = findButtonByText(wrapper, 'Use Template');
    expect(unavailableButton).toBeDefined();
    expect(unavailableButton!.attributes('aria-disabled')).toBe('true');
    expect(document.body.textContent).toContain(
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
