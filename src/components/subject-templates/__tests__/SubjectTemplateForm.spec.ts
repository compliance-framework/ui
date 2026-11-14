import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import {
  createSubjectTemplateFormFromTemplate,
  type SubjectTemplate,
} from '@/types/subject-templates';
import SubjectTemplateForm from '../SubjectTemplateForm.vue';

const create = vi.hoisted(() => ({
  loading: undefined as unknown,
  execute: vi.fn(),
}));
const update = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => {
    if (url) {
      create.loading = ref(false);
      return { execute: create.execute, isLoading: create.loading };
    }
    return { execute: update.execute, isLoading: ref(false) };
  },
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const stubs = {
  FormInput: {
    props: ['modelValue', 'id'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  FormTextarea: { props: ['modelValue'], template: '<textarea />' },
  Select: { props: ['modelValue'], template: '<select />' },
  MultiSelect: { props: ['modelValue'], template: '<select multiple />' },
  Panel: { template: '<div><slot /><slot name="header" /></div>' },
  PrimaryButton: { template: '<button type="submit"><slot /></button>' },
  SecondaryButton: { template: '<button type="button"><slot /></button>' },
  TertiaryButton: { template: '<button type="button"><slot /></button>' },
  LabelSchemaBuilder: { props: ['modelValue'], template: '<div />' },
  SelectorLabelsBuilder: { props: ['modelValue'], template: '<div />' },
  TemplatePreview: {
    props: ['disabled'],
    template:
      '<div data-testid="template-preview" :data-disabled="String(disabled)" />',
  },
};

const template: SubjectTemplate = {
  id: 'template-1',
  name: 'GitHub Organization',
  type: 'component',
  sourceMode: 'runtime-derived',
  displayPriority: 7,
  componentType: 'software',
  selectorLabels: [{ key: '_plugin', value: 'github' }],
  labelSchema: [{ key: 'organization', description: '' }],
  identityLabelKeys: ['organization'],
};

describe('SubjectTemplateForm', () => {
  it('keeps display priority and component type when saving an edit', async () => {
    update.execute.mockResolvedValue({});
    const wrapper = mount(SubjectTemplateForm, {
      props: {
        initial: createSubjectTemplateFormFromTemplate(template),
        templateId: 'template-1',
      },
      global: { stubs },
    });
    expect(
      (
        wrapper.find('#subject-template-display-priority')
          .element as HTMLInputElement
      ).value,
    ).toBe('7');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(update.execute).toHaveBeenCalledWith(
      '/api/admin/subject-templates/template-1',
      {
        data: expect.objectContaining({
          displayPriority: 7,
          componentType: 'software',
        }),
      },
    );
    expect(wrapper.emitted('saved')).toHaveLength(1);
  });

  it('disables the template preview while saving', async () => {
    const wrapper = mount(SubjectTemplateForm, {
      props: { initial: createSubjectTemplateFormFromTemplate(template) },
      global: { stubs },
    });
    (create.loading as { value: boolean }).value = true;
    await nextTick();
    expect(
      wrapper
        .get('[data-testid="template-preview"]')
        .attributes('data-disabled'),
    ).toBe('true');
  });
});
