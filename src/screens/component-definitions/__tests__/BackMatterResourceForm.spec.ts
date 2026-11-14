import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import BackMatterResourceForm from '../BackMatterResourceForm.vue';

const api = vi.hoisted(() => ({ post: vi.fn(() => Promise.resolve({})) }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('BackMatterResourceForm', () => {
  it('sends the existing resources with the new one, since the API replaces the list', async () => {
    const existing = [{ uuid: 'r-1', title: 'Policy', description: 'Old' }];
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(BackMatterResourceForm, {
              componentDefinitionId: 'cd-1',
              existing,
            }),
          ),
      }),
    );
    await wrapper.findAll('input')[0]!.setValue('Runbook');
    await wrapper.findAll('textarea')[0]!.setValue('How to operate it');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0] as unknown as [
      string,
      { resources: unknown[] },
    ];
    expect(url).toBe('/api/oscal/component-definitions/cd-1/back-matter');
    expect(body.resources).toHaveLength(2);
    expect(body.resources[0]).toEqual(existing[0]);
    expect(body.resources[1]).toMatchObject({
      title: 'Runbook',
      description: 'How to operate it',
    });
    expect(
      wrapper.findComponent(BackMatterResourceForm).emitted('created'),
    ).toHaveLength(1);
  });
});
