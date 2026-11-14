import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import SubjectTemplatePreview from '../SubjectTemplatePreview.vue';

const mountPreview = (props: Record<string, unknown> = {}) =>
  mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SubjectTemplatePreview, {
            titleTemplate: 'Repo {{repository}} - {{missing}}',
            descriptionTemplate: '',
            purposeTemplate: '',
            remarksTemplate: '',
            labelSchema: [{ key: 'repository', description: 'Repository' }],
            ...props,
          }),
        ),
    }),
  );

const open = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.find('button[aria-expanded]').trigger('click');
};

describe('SubjectTemplatePreview', () => {
  it('prefills sample labels from the schema and renders with them', async () => {
    const wrapper = mountPreview();
    await open(wrapper);
    const inputs = wrapper.findAll('input');
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('repository');
    await inputs[1]!.setValue('ccf-ui');
    expect(wrapper.text()).toContain('Repo ccf-ui - {{missing}}');
    expect(wrapper.text()).toContain('Unresolved placeholders');
    expect(wrapper.text()).toContain('missing');
  });

  it("doesn't add sample labels while saving", async () => {
    const wrapper = mountPreview({ disabled: true });
    await open(wrapper);
    const add = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Add label'))!;
    expect(add.attributes('aria-disabled')).toBe('true');
  });
});
