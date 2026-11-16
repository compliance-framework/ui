import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { Capability } from '@/oscal';
import CapabilityForm from '../CapabilityForm.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const mountForm = (capability?: Capability) =>
  mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(CapabilityForm, { componentDefinitionId: 'cd-1', capability }),
        ),
    }),
  );

describe('CapabilityForm', () => {
  beforeEach(() => {
    api.post
      .mockReset()
      .mockResolvedValue({ data: { data: [{ uuid: 'cap-9' }] } });
    api.put
      .mockReset()
      .mockResolvedValue({ data: { data: { uuid: 'cap-1' } } });
  });

  it('requires a name and description, then creates the capability in a batch', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a name.');
    await wrapper.find('input').setValue('Encrypted transit');
    await wrapper.find('textarea').setValue('TLS everywhere');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/component-definitions/cd-1/capabilities');
    expect(body).toEqual([
      expect.objectContaining({
        name: 'Encrypted transit',
        description: 'TLS everywhere',
      }),
    ]);
    expect(
      wrapper.findComponent(CapabilityForm).emitted('created')![0],
    ).toEqual([{ uuid: 'cap-9' }]);
  });

  it('updates an existing capability by its id', async () => {
    const wrapper = mountForm({
      uuid: 'cap-1',
      name: 'Old',
      description: 'Desc',
    });
    await wrapper.find('input').setValue('New');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put.mock.calls[0]![0]).toBe(
      '/api/oscal/component-definitions/cd-1/capabilities/cap-1',
    );
    expect(api.put.mock.calls[0]![1]).toMatchObject({
      uuid: 'cap-1',
      name: 'New',
    });
    expect(
      wrapper.findComponent(CapabilityForm).emitted('updated'),
    ).toHaveLength(1);
  });
});
