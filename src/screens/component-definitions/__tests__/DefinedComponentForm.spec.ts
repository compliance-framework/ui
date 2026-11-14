import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import DefinedComponentForm from '../DefinedComponentForm.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('DefinedComponentForm', () => {
  beforeEach(() => {
    // jsdom has no scrollIntoView; the type completions call it.
    Element.prototype.scrollIntoView = vi.fn();
    api.post
      .mockReset()
      .mockResolvedValue({ data: { data: [{ uuid: 'c-9' }] } });
  });

  it('requires every field, then creates the component in a batch', async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(DefinedComponentForm, { componentDefinitionId: 'cd-1' }),
          ),
      }),
    );
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a title.');
    expect(wrapper.text()).toContain('Enter its purpose.');
    const [title, type] = wrapper.findAll('input');
    await title!.setValue('Ingress gateway');
    await type!.setValue('service');
    const [description, purpose] = wrapper.findAll('textarea');
    await description!.setValue('Routes traffic');
    await purpose!.setValue('Entry point');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/component-definitions/cd-1/components');
    expect(body).toEqual([
      expect.objectContaining({
        type: 'service',
        title: 'Ingress gateway',
        description: 'Routes traffic',
        purpose: 'Entry point',
      }),
    ]);
    expect(
      wrapper.findComponent(DefinedComponentForm).emitted('created'),
    ).toHaveLength(1);
  });
});
