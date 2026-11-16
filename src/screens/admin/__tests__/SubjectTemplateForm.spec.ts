import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import {
  createEmptySubjectTemplateForm,
  createSubjectTemplateFormFromTemplate,
  type SubjectTemplate,
} from '@/types/subject-templates';
import SubjectTemplateForm from '../SubjectTemplateForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

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

function mountForm(props: Record<string, unknown>) {
  const events: string[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SubjectTemplateForm, {
            ...props,
            onSaved: () => events.push('saved'),
          } as never),
        ),
    }),
  );
  return { wrapper, events };
}

describe('SubjectTemplateForm', () => {
  beforeEach(() => {
    api.post.mockReset().mockResolvedValue({ data: { data: {} } });
    api.put.mockReset().mockResolvedValue({ data: { data: {} } });
  });

  it('keeps display priority and component type when saving an edit', async () => {
    const { wrapper, events } = mountForm({
      initial: createSubjectTemplateFormFromTemplate(template),
      templateId: 'template-1',
    });
    expect(
      (wrapper.find('input[type="number"]').element as HTMLInputElement).value,
    ).toBe('7');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put.mock.calls[0]![0]).toBe(
      '/api/admin/subject-templates/template-1',
    );
    expect(api.put.mock.calls[0]![1]).toEqual(
      expect.objectContaining({
        displayPriority: 7,
        componentType: 'software',
        identityLabelKeys: ['organization'],
      }),
    );
    expect(events).toEqual(['saved']);
  });

  it('offers the schema keys as identity keys', () => {
    const { wrapper } = mountForm({
      initial: createSubjectTemplateFormFromTemplate(template),
    });
    const box = wrapper
      .findAll('label')
      .find((l) => l.text() === 'organization');
    expect(box).toBeDefined();
  });

  it('asks for a name before saving', async () => {
    const { wrapper } = mountForm({
      initial: createEmptySubjectTemplateForm(),
    });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a name.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows the form's own checks in the form", async () => {
    const initial = createEmptySubjectTemplateForm();
    initial.name = 'New one';
    const { wrapper } = mountForm({ initial });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Not saved');
    expect(wrapper.text()).toMatch(/At least one .* is required\./);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a template with POST', async () => {
    const { wrapper, events } = mountForm({
      initial: { ...createSubjectTemplateFormFromTemplate(template) },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post.mock.calls[0]![0]).toBe('/api/admin/subject-templates');
    expect(events).toEqual(['saved']);
  });

  it('shows a failed save in the form', async () => {
    api.put.mockRejectedValueOnce({
      response: { status: 400, data: { errors: { body: 'Name taken' } } },
    });
    const { wrapper } = mountForm({
      initial: createSubjectTemplateFormFromTemplate(template),
      templateId: 'template-1',
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Name taken');
  });
});
