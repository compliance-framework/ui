import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import type { RiskTemplate } from '@/types/risk-templates';

const templates = shallowRef<RiskTemplate[]>([
  {
    id: 'template-1',
    title: 'Network Risk',
    description: 'Template description',
    defaultLikelihood: 'high',
    defaultImpact: 'moderate',
    usageCount: 3,
  },
]);
const listLoading = ref(false);
const listError = ref(null);

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

vi.mock('@/volt/MultiSelect.vue', () => ({
  default: {
    name: 'MultiSelect',
    template: '<div class="multi-select-stub"></div>',
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
        title: 'Network Risk',
        description: 'Template description',
        defaultLikelihood: 'high',
        defaultImpact: 'moderate',
        usageCount: 3,
      },
    ];
    listLoading.value = false;
    listError.value = null;
    createLoading.value = false;
    updateLoading.value = false;
  });

  it('duplicates a template with the "(Copy)" suffix', async () => {
    const wrapper = mount(RiskTemplatesView);

    const duplicateButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Duplicate');

    expect(duplicateButton).toBeDefined();

    await duplicateButton!.trigger('click');

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      '/api/admin/risk-templates',
      {
        data: expect.objectContaining({
          title: 'Network Risk (Copy)',
          description: 'Template description',
        }),
      },
    );
  });

  it('shows usage count warning in delete confirmation message', async () => {
    const wrapper = mount(RiskTemplatesView);

    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete');

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
        title: 'No Id Template',
        description: 'No identifier present',
      },
    ];

    const wrapper = mount(RiskTemplatesView);

    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit');

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
    const duplicateButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Duplicate');

    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Duplicate Failed',
        detail: 'Template title already exists',
      }),
    );
  });
});
