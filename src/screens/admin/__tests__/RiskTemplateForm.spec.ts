import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import RiskTemplateForm from '../RiskTemplateForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  put: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));

function mountForm(props: Record<string, unknown> = {}) {
  const saved: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(RiskTemplateForm, {
            ...props,
            onSaved: (t: unknown) => saved.push(t),
          }),
        ),
    }),
  );
  return { wrapper, saved };
}

const field = (wrapper: ReturnType<typeof mount>, label: string) => {
  const el = wrapper
    .findAll('label')
    .find((l) => l.text().replace('*', '').trim() === label)!;
  return wrapper.find(`[id="${el.attributes('for')}"]`);
};

describe('RiskTemplateForm', () => {
  beforeEach(() => {
    api.post.mockReset().mockResolvedValue({ data: { data: { title: 't' } } });
    api.put.mockReset().mockResolvedValue({ data: { data: { title: 't' } } });
  });

  it('names each missing required field', async () => {
    const { wrapper } = mountForm();
    await wrapper.find('form').trigger('submit');
    for (const message of [
      'Enter the plugin ID.',
      'Enter the policy package.',
      'Enter a name.',
      'Enter a title.',
      'Enter the risk statement.',
    ])
      expect(wrapper.text()).toContain(message);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates with POST from the required fields only', async () => {
    const { wrapper, saved } = mountForm();
    await field(wrapper, 'Plugin ID').setValue('p');
    await field(wrapper, 'Policy package').setValue('pkg');
    await field(wrapper, 'Name').setValue('n');
    await field(wrapper, 'Title').setValue('t');
    await field(wrapper, 'Statement').setValue('s');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post.mock.calls[0]![0]).toBe('/api/admin/risk-templates');
    expect(api.post.mock.calls[0]![1]).toMatchObject({
      pluginId: 'p',
      statement: 's',
      remediationTemplate: undefined,
    });
    expect(saved).toHaveLength(1);
  });

  it('saves an edit with PUT to the template', async () => {
    const { wrapper } = mountForm({
      template: {
        id: 'template-1',
        pluginId: 'p',
        policyPackage: 'pkg',
        name: 'n',
        title: 't',
        statement: 's',
      },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put.mock.calls[0]![0]).toBe(
      '/api/admin/risk-templates/template-1',
    );
  });
});
