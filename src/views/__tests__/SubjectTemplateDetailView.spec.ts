import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { SubjectTemplate } from '@/types/subject-templates';

const template = ref<SubjectTemplate | undefined>({
  id: 'template-1',
  name: 'Template One',
  type: 'component',
  sourceMode: 'automatic',
  titleTemplate: '{{repository}}',
  descriptionTemplate: 'Desc',
  purposeTemplate: 'Purpose',
  remarksTemplate: 'Remarks',
  identityLabelKeys: ['repository'],
  selectorLabels: [{ key: 'plugin', value: 'github' }],
  labelSchema: [{ key: 'repository', description: 'Repo name' }],
  props: [{ name: 'lifecycle', value: 'production' }],
  links: [{ href: 'https://example.com', text: 'Example' }],
});

const isLoading = ref(false);
const error = ref<unknown>(null);
const toastAdd = vi.fn();

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: template,
    isLoading,
    error,
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
    remove: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      id: 'template-1',
    },
  }),
}));

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

import SubjectTemplateDetailView from '../admin/SubjectTemplateDetailView.vue';

describe('SubjectTemplateDetailView', () => {
  it('renders template details and provides edit entry point', () => {
    const wrapper = mount(SubjectTemplateDetailView, {
      global: {
        stubs: {
          Chip: {
            props: ['label'],
            template: '<span>{{ label }}</span>',
          },
          RouterLinkButton: {
            props: ['to'],
            template:
              '<button type="button" :data-to="JSON.stringify(to)"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Template One');
    expect(wrapper.text()).toContain('repository');
    expect(wrapper.text()).toContain('plugin: github');

    const editButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Edit Template');

    expect(editButton).toBeDefined();
    expect(editButton?.attributes('data-to')).toContain(
      '"name":"admin-subject-templates"',
    );
    expect(editButton?.attributes('data-to')).toContain('"edit":"template-1"');
  });
});
