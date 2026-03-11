import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import type { RiskTemplate } from '@/types/risk-templates';

const templates = shallowRef<RiskTemplate[]>([
  {
    id: 'template-1',
    pluginId: 'plugin-a',
    policyPackage: 'policy-a',
    name: 'network-risk',
    title: 'Network Risk',
    statement: 'Network risk statement',
    likelihoodHint: 'high',
    impactHint: 'moderate',
    usageCount: 3,
  },
]);
const listLoading = ref(false);
const listError = ref<unknown>(null);

const createLoading = ref(false);
const updateLoading = ref(false);

const mockLoadTemplates = vi.fn().mockResolvedValue({});
const mockCreateTemplate = vi.fn().mockResolvedValue({});
const mockUpdateTemplate = vi.fn().mockResolvedValue({});
const mockDeleteTemplate = vi.fn().mockResolvedValue({});
const toastAdd = vi.fn();
const confirmRequire = vi.fn();

vi.mock('@/composables/axios', () => ({
  useDataApi: (
    url?: string | null,
    config?: {
      method?: string;
    },
  ) => {
    if (url === '/api/admin/risk-templates' && config?.method === 'POST') {
      return {
        execute: mockCreateTemplate,
        isLoading: createLoading,
      };
    }

    if (url === '/api/admin/risk-templates') {
      return {
        data: templates,
        isLoading: listLoading,
        error: listError,
        execute: mockLoadTemplates,
      };
    }

    if (url === null && config?.method === 'PUT') {
      return {
        execute: mockUpdateTemplate,
        isLoading: updateLoading,
      };
    }

    if (url === null && config?.method === 'DELETE') {
      return {
        execute: mockDeleteTemplate,
      };
    }

    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
    remove: vi.fn(),
  }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: confirmRequire,
  }),
}));

vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    name: 'PageHeader',
    template: '<h1><slot /></h1>',
  },
}));

vi.mock('@/components/PageSubHeader.vue', () => ({
  default: {
    name: 'PageSubHeader',
    template: '<h2><slot /></h2>',
  },
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    template: '<div v-if="visible"><slot /></div>',
    props: ['visible', 'size', 'modal', 'header'],
  },
}));

vi.mock('@/volt/PrimaryButton.vue', () => ({
  default: {
    name: 'PrimaryButton',
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}));

vi.mock('@/volt/TertiaryButton.vue', () => ({
  default: {
    name: 'TertiaryButton',
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}));

import RiskTemplatesView from '../admin/RiskTemplatesView.vue';

describe('RiskTemplatesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    templates.value = [
      {
        id: 'template-1',
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'network-risk',
        title: 'Network Risk',
        statement: 'Network risk statement',
        likelihoodHint: 'high',
        impactHint: 'moderate',
        usageCount: 3,
      },
    ];
    listLoading.value = false;
    listError.value = null;
    createLoading.value = false;
    updateLoading.value = false;
  });

  const findButtonByText = (
    wrapper: ReturnType<typeof mount>,
    label: string,
  ) => {
    return wrapper.findAll('button').find((button) => button.text() === label);
  };

  it('creates using only required fields and leaves optional fields unset', async () => {
    const wrapper = mount(RiskTemplatesView);

    const createButton = findButtonByText(wrapper, 'Create Template');
    expect(createButton).toBeDefined();
    await createButton!.trigger('click');

    await wrapper
      .find('input[placeholder="e.g. aws-security-hub"]')
      .setValue('plugin-x');
    await wrapper
      .find('input[placeholder="e.g. cis-aws-foundations"]')
      .setValue('policy-x');
    await wrapper
      .find('input[placeholder="machine-friendly template name"]')
      .setValue('template-name');
    await wrapper
      .find('input[placeholder="human-friendly title"]')
      .setValue('Template Title');
    await wrapper
      .find('textarea[placeholder="Risk statement text"]')
      .setValue('Risk statement body');

    await wrapper.find('form').trigger('submit');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          pluginId: 'plugin-x',
          policyPackage: 'policy-x',
          name: 'template-name',
          title: 'Template Title',
          statement: 'Risk statement body',
        }),
      },
    );

    const payload = mockCreateTemplate.mock.calls[0][1].data;
    expect(payload.likelihoodHint).toBeUndefined();
    expect(payload.impactHint).toBeUndefined();
    expect(payload.violationIds).toBeUndefined();
    expect(payload.threatIds).toBeUndefined();
    expect(payload.remediationTemplate).toBeUndefined();
    expect(payload.isActive).toBeUndefined();
  });

  it('duplicates a template with the "(Copy)" suffix', async () => {
    const wrapper = mount(RiskTemplatesView);

    const duplicateButton = findButtonByText(wrapper, 'Duplicate');
    expect(duplicateButton).toBeDefined();

    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          pluginId: 'plugin-a',
          policyPackage: 'policy-a',
          name: 'network-risk-copy',
          title: 'Network Risk (Copy)',
          statement: 'Network risk statement',
        }),
      },
    );
  });

  it('shows insufficient permissions toast when list load fails with 403', async () => {
    mount(RiskTemplatesView);

    listError.value = {
      response: {
        status: 403,
      },
    };
    await nextTick();

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Insufficient permissions',
        detail: "You don't have access to risk templates.",
      }),
    );
  });

  it('trims required fields when duplicating a template', async () => {
    templates.value = [
      {
        id: 'template-1',
        pluginId: '  plugin-a  ',
        policyPackage: '  policy-a  ',
        name: '  network-risk  ',
        title: '  Network Risk  ',
        statement: '  Network risk statement  ',
      },
    ];

    const wrapper = mount(RiskTemplatesView);
    const duplicateButton = findButtonByText(wrapper, 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          pluginId: 'plugin-a',
          policyPackage: 'policy-a',
          name: 'network-risk-copy',
          title: 'Network Risk (Copy)',
          statement: 'Network risk statement',
        }),
      },
    );
  });

  it('normalizes remediation task orderIndex during duplication', async () => {
    templates.value = [
      {
        id: 'template-1',
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'network-risk',
        title: 'Network Risk',
        statement: 'Network risk statement',
        remediationTemplate: {
          title: 'Remediation',
          description: '   ',
          tasks: [
            { title: '  Task A  ' },
            { title: '   ', orderIndex: 55 },
            { title: 'Task B', orderIndex: 99 },
          ],
        },
      },
    ];

    const wrapper = mount(RiskTemplatesView);
    const duplicateButton = findButtonByText(wrapper, 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          remediationTemplate: {
            title: 'Remediation',
            description: undefined,
            tasks: [
              { title: 'Task A', orderIndex: 0 },
              { title: 'Task B', orderIndex: 1 },
            ],
          },
        }),
      },
    );
  });

  it('normalizes threat ids when duplicating a template', async () => {
    templates.value = [
      {
        id: 'template-1',
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'network-risk',
        title: 'Network Risk',
        statement: 'Network risk statement',
        threatIds: [
          {
            system: '  cwe  ',
            id: '  CWE-79  ',
            title: '  Cross-site Scripting  ',
            url: '  https://cwe.mitre.org/data/definitions/79.html  ',
          },
          { system: '  ', id: ' ', title: ' ', url: '   ' },
        ],
      },
    ];

    const wrapper = mount(RiskTemplatesView);
    const duplicateButton = findButtonByText(wrapper, 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          threatIds: [
            {
              system: 'cwe',
              id: 'CWE-79',
              title: 'Cross-site Scripting',
              url: 'https://cwe.mitre.org/data/definitions/79.html',
            },
          ],
        }),
      },
    );
  });

  it('rejects duplication when a threat id entry is incomplete', async () => {
    templates.value = [
      {
        id: 'template-1',
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'network-risk',
        title: 'Network Risk',
        statement: 'Network risk statement',
        threatIds: [
          {
            system: 'cwe',
            id: '',
            title: 'Cross-site Scripting',
            url: '',
          },
        ],
      },
    ];

    const wrapper = mount(RiskTemplatesView);
    const duplicateButton = findButtonByText(wrapper, 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).not.toHaveBeenCalled();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Duplicate Failed',
        detail: 'Threat IDs must include system, id, and title when provided.',
      }),
    );
  });

  it('reindexes remediation tasks after filtering blank entries on create', async () => {
    const wrapper = mount(RiskTemplatesView);

    const createButton = findButtonByText(wrapper, 'Create Template');
    expect(createButton).toBeDefined();
    await createButton!.trigger('click');

    await wrapper
      .find('input[placeholder="e.g. aws-security-hub"]')
      .setValue('plugin-x');
    await wrapper
      .find('input[placeholder="e.g. cis-aws-foundations"]')
      .setValue('policy-x');
    await wrapper
      .find('input[placeholder="machine-friendly template name"]')
      .setValue('template-name');
    await wrapper
      .find('input[placeholder="human-friendly title"]')
      .setValue('Template Title');
    await wrapper
      .find('textarea[placeholder="Risk statement text"]')
      .setValue('Risk statement body');

    await wrapper.find('#remediation-enabled').setValue(true);
    await wrapper
      .find('input[placeholder="Remediation template title"]')
      .setValue('Remediation title');

    const addButtons = wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Add');
    const remediationAddButton = addButtons[addButtons.length - 1];

    expect(remediationAddButton).toBeDefined();
    await remediationAddButton.trigger('click');
    await remediationAddButton.trigger('click');

    const taskInputs = wrapper.findAll('input[placeholder^="Task #"]');
    expect(taskInputs).toHaveLength(2);
    await taskInputs[0].setValue('   ');
    await taskInputs[1].setValue('  Investigate control  ');

    await wrapper.find('form').trigger('submit');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          remediationTemplate: {
            title: 'Remediation title',
            description: undefined,
            tasks: [{ title: 'Investigate control', orderIndex: 0 }],
          },
        }),
      },
    );
  });

  it('shows usage count warning in delete confirmation message', async () => {
    const wrapper = mount(RiskTemplatesView);

    const deleteButton = findButtonByText(wrapper, 'Delete');
    expect(deleteButton).toBeDefined();

    await deleteButton!.trigger('click');

    expect(confirmRequire).toHaveBeenCalled();
    const confirmOptions = confirmRequire.mock.calls[0][0];
    expect(confirmOptions.message).toContain('used by 3 risk(s)');

    await confirmOptions.accept();

    expect(mockDeleteTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates/template-1',
    );
  });

  it('shows a validation toast when editing a template without id/uuid', async () => {
    templates.value = [
      {
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'no-id',
        title: 'No Id Template',
        statement: 'Statement',
      },
    ];

    const wrapper = mount(RiskTemplatesView);

    const editButton = findButtonByText(wrapper, 'Edit');
    expect(editButton).toBeDefined();
    await editButton!.trigger('click');

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Invalid Template',
      }),
    );
  });

  it('uses API error body details for duplicate failure toasts', async () => {
    mockCreateTemplate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          errors: {
            body: 'Template title already exists',
          },
        },
      },
    });

    const wrapper = mount(RiskTemplatesView);
    const duplicateButton = findButtonByText(wrapper, 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Duplicate Failed',
        detail: 'Template title already exists',
      }),
    );
  });

  it('does not open delete confirmation when template has no id/uuid', async () => {
    templates.value = [
      {
        pluginId: 'plugin-a',
        policyPackage: 'policy-a',
        name: 'no-id',
        title: 'No Id Template',
        statement: 'Statement',
      },
    ];

    const wrapper = mount(RiskTemplatesView);

    const deleteButton = findButtonByText(wrapper, 'Delete');
    expect(deleteButton).toBeDefined();
    await deleteButton!.trigger('click');

    expect(confirmRequire).not.toHaveBeenCalled();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Invalid Template',
        detail: 'Template is missing an identifier and cannot be deleted.',
      }),
    );
  });

  it('ignores submit attempts while in view mode', async () => {
    const wrapper = mount(RiskTemplatesView);

    const viewButton = findButtonByText(wrapper, 'View');
    expect(viewButton).toBeDefined();
    await viewButton!.trigger('click');

    await wrapper.find('form').trigger('submit');

    expect(mockCreateTemplate).not.toHaveBeenCalled();
    expect(mockUpdateTemplate).not.toHaveBeenCalled();
  });
});
