import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TemplatePreview from '../TemplatePreview.vue';

describe('TemplatePreview', () => {
  it('shows rendered values and unresolved placeholder warnings', async () => {
    const wrapper = mount(TemplatePreview, {
      props: {
        titleTemplate: 'Repo {{repository}} - {{missing}}',
        descriptionTemplate: '',
        purposeTemplate: '',
        remarksTemplate: '',
        labelSchema: [{ key: 'repository', description: 'Repository name' }],
      },
      global: {
        stubs: {
          Panel: {
            template: '<div><slot /><slot name="header" /></div>',
          },
          TertiaryButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    const valueInput = wrapper.find('input[placeholder="Label value"]');
    expect(valueInput.exists()).toBe(true);
    await valueInput.setValue('ccf-ui');

    expect(wrapper.text()).toContain('Repo ccf-ui - {{missing}}');
    expect(wrapper.text()).toContain('Unresolved placeholders');
    expect(wrapper.text()).toContain('missing');
  });

  it('prevents adding sample labels when disabled', async () => {
    const wrapper = mount(TemplatePreview, {
      props: {
        titleTemplate: 'Repo {{repository}}',
        descriptionTemplate: '',
        purposeTemplate: '',
        remarksTemplate: '',
        labelSchema: [{ key: 'repository', description: 'Repository name' }],
        disabled: true,
      },
      global: {
        stubs: {
          Panel: {
            template: '<div><slot /><slot name="header" /></div>',
          },
          TertiaryButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Label');

    expect(addButton).toBeDefined();
    expect(addButton!.attributes('disabled')).toBeDefined();

    const initialRows = wrapper.findAll(
      'input[placeholder="Label key"]',
    ).length;
    await addButton!.trigger('click');
    const rowsAfterClick = wrapper.findAll(
      'input[placeholder="Label key"]',
    ).length;

    expect(rowsAfterClick).toBe(initialRows);
  });
});
