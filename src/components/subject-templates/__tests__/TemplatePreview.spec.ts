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
            template: '<button type="button"><slot /></button>',
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
});
