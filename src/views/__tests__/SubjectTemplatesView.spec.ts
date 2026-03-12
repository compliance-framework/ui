import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive, ref, shallowRef } from 'vue';
import type { SubjectTemplate } from '@/types/subject-templates';

const templates = shallowRef<SubjectTemplate[]>([]);
const listLoading = ref(false);
const listError = ref<unknown>(null);
const createLoading = ref(false);
const updateLoading = ref(false);

const mockLoadTemplates = vi.fn().mockResolvedValue({});
const mockCreateTemplate = vi.fn().mockResolvedValue({});
const mockUpdateTemplate = vi.fn().mockResolvedValue({});
const toastAdd = vi.fn();
const replaceMock = vi.fn();

const routeMock = reactive({
  query: {} as Record<string, string>,
});

vi.mock('@/composables/axios', () => ({
  useDataApi: (
    url?: string | null,
    config?: {
      method?: string;
    },
  ) => {
    if (url === '/api/subject-templates' && config?.method === 'POST') {
      return {
        execute: mockCreateTemplate,
        isLoading: createLoading,
      };
    }

    if (url === '/api/subject-templates') {
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

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

const buttonStub = {
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
};

const formInputStub = {
  props: ['modelValue', 'placeholder', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const formTextareaStub = {
  props: ['modelValue', 'placeholder', 'disabled', 'rows'],
  emits: ['update:modelValue'],
  template:
    '<textarea :value="modelValue" :placeholder="placeholder" :disabled="disabled" :rows="rows" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const selectStub = {
  props: [
    'modelValue',
    'options',
    'optionLabel',
    'optionValue',
    'disabled',
    'placeholder',
  ],
  emits: ['update:modelValue'],
  template: `
    <select
      :value="modelValue ?? ''"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value || null)"
    >
      <option value="">{{ placeholder || '' }}</option>
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="String(optionValue ? option[optionValue] : option)"
      >
        {{ optionLabel ? option[optionLabel] : option }}
      </option>
    </select>
  `,
};

const multiSelectStub = {
  props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'disabled'],
  emits: ['update:modelValue'],
  template: `
    <select
      multiple
      :disabled="disabled"
      @change="$emit('update:modelValue', Array.from($event.target.selectedOptions).map((option) => option.value))"
    >
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="String(optionValue ? option[optionValue] : option)"
      >
        {{ optionLabel ? option[optionLabel] : option }}
      </option>
    </select>
  `,
};

vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    template: '<h1><slot /></h1>',
  },
}));

vi.mock('@/components/PageSubHeader.vue', () => ({
  default: {
    template: '<h2><slot /></h2>',
  },
}));

import SubjectTemplatesView from '../admin/SubjectTemplatesView.vue';

describe('SubjectTemplatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    templates.value = [
      {
        id: 'template-1',
        name: 'Alpha Template',
        type: 'component',
        sourceMode: 'automatic',
        selectorLabels: [{ key: 'plugin', value: 'github' }],
        labelSchema: [{ key: 'repository', description: 'repo' }],
        identityLabelKeys: ['repository'],
      },
      {
        id: 'template-2',
        name: 'Beta Template',
        type: 'inventory-item',
        sourceMode: 'manual',
        selectorLabels: [{ key: 'plugin', value: 'jira' }],
        labelSchema: [{ key: 'project', description: 'project' }],
        identityLabelKeys: ['project'],
      },
    ];

    listLoading.value = false;
    listError.value = null;
    createLoading.value = false;
    updateLoading.value = false;
    routeMock.query = {};
  });

  function mountView() {
    return mount(SubjectTemplatesView, {
      global: {
        stubs: {
          InputText: formInputStub,
          Select: selectStub,
          MultiSelect: multiSelectStub,
          Dialog: {
            props: ['visible', 'header'],
            template: '<div v-if="visible"><slot /></div>',
          },
          PrimaryButton: buttonStub,
          SecondaryButton: buttonStub,
          TertiaryButton: buttonStub,
          RouterLinkButton: {
            props: ['to'],
            template:
              '<button type="button" :data-to="JSON.stringify(to)"><slot /></button>',
          },
          Chip: {
            props: ['label'],
            template: '<span>{{ label }}</span>',
          },
          Panel: {
            template: '<div><slot /><slot name="header" /></div>',
          },
          FormInput: formInputStub,
          FormTextarea: formTextareaStub,
          LabelSchemaBuilder: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div>LabelSchemaBuilder</div>',
          },
          SelectorLabelsBuilder: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div>SelectorLabelsBuilder</div>',
          },
          TemplatePreview: {
            template: '<div>TemplatePreview</div>',
          },
        },
      },
    });
  }

  const findButtonByText = (
    wrapper: ReturnType<typeof mountView>,
    label: string,
  ) => {
    return wrapper.findAll('button').find((button) => button.text() === label);
  };

  it('renders list data and filters by search text', async () => {
    const wrapper = mountView();

    expect(wrapper.text()).toContain('Alpha Template');
    expect(wrapper.text()).toContain('Beta Template');

    const searchInput = wrapper.find(
      'input[placeholder="Search by template name"]',
    );
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue('beta');

    expect(wrapper.text()).not.toContain('Alpha Template');
    expect(wrapper.text()).toContain('Beta Template');
  });

  it('filters templates by type and source mode', async () => {
    const wrapper = mountView();

    const selects = wrapper.findAll('select');
    // Type filter
    await selects[0].setValue('inventory-item');
    // Source mode filter
    await selects[1].setValue('manual');

    expect(wrapper.text()).toContain('Beta Template');
    expect(wrapper.text()).not.toContain('Alpha Template');
  });

  it('supports client-side pagination', async () => {
    templates.value = Array.from({ length: 12 }, (_entry, index) => ({
      id: `template-${index + 1}`,
      name: `Template ${index + 1}`,
      type: 'component',
      sourceMode: 'automatic',
      selectorLabels: [{ key: 'plugin', value: 'github' }],
      labelSchema: [{ key: 'repository', description: '' }],
      identityLabelKeys: ['repository'],
    }));

    const wrapper = mountView();

    expect(wrapper.text()).toContain('Showing 1-10 of 12');

    const nextButton = findButtonByText(wrapper, 'Next');
    expect(nextButton).toBeDefined();
    await nextButton!.trigger('click');

    expect(wrapper.text()).toContain('Showing 11-12 of 12');
    expect(wrapper.text()).toContain('Template 11');
    expect(wrapper.text()).toContain('Template 12');
  });

  it('duplicates with a unique copy name and opens the dialog', async () => {
    templates.value = [
      {
        id: 'template-1',
        name: 'Template',
        type: 'component',
        sourceMode: 'automatic',
        selectorLabels: [{ key: 'plugin', value: 'github' }],
        labelSchema: [{ key: 'repository', description: '' }],
        identityLabelKeys: ['repository'],
      },
      {
        id: 'template-2',
        name: 'Template (Copy)',
        type: 'component',
        sourceMode: 'automatic',
        selectorLabels: [{ key: 'plugin', value: 'github' }],
        labelSchema: [{ key: 'repository', description: '' }],
        identityLabelKeys: ['repository'],
      },
    ];

    const wrapper = mountView();

    const duplicateButton = findButtonByText(wrapper, 'Duplicate');
    expect(duplicateButton).toBeDefined();
    await duplicateButton!.trigger('click');

    const nameInput = wrapper.find('input[placeholder="Template name"]');
    expect(nameInput.exists()).toBe(true);
    expect((nameInput.element as HTMLInputElement).value).toBe(
      'Template (Copy 2)',
    );
  });

  it('shows insufficient permissions toast on 403 list errors', async () => {
    mountView();

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
        detail: "You don't have access to subject templates.",
      }),
    );
  });

  it('shows an error toast when editing a template without id', async () => {
    templates.value = [
      {
        name: 'No Id Template',
        type: 'component',
        sourceMode: 'automatic',
        selectorLabels: [{ key: 'plugin', value: 'github' }],
        labelSchema: [{ key: 'repository', description: '' }],
        identityLabelKeys: ['repository'],
      },
    ];

    const wrapper = mountView();

    const editButton = findButtonByText(wrapper, 'Edit');
    expect(editButton).toBeDefined();
    await editButton!.trigger('click');

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Invalid Template',
        detail: 'Template is missing an identifier and cannot be edited.',
      }),
    );
  });
});
