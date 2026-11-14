import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { POAMLocalDefinitions } from '@/oscal';
import LocalDefinitionsForm from '../LocalDefinitionsForm.vue';

const api = vi.hoisted(() => ({
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ data: { data: {} } }),
  ),
  post: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));

const mountForm = (localDefinitions?: POAMLocalDefinitions) =>
  mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(LocalDefinitionsForm, { poamId: 'p-1', localDefinitions }),
        ),
    }),
  );

describe('LocalDefinitionsForm', () => {
  it('always saves with PUT to the plan, adding or editing', async () => {
    for (const existing of [undefined, { remarks: 'Old' }]) {
      api.put.mockClear();
      const wrapper = mountForm(existing);
      await wrapper.find('form').trigger('submit');
      await flushPromises();
      expect(api.put.mock.calls[0]![0]).toBe(
        '/api/oscal/plan-of-action-and-milestones/p-1/local-definitions',
      );
      expect(api.post).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  });

  it('drops rows left empty, keeping components that have a title', async () => {
    const wrapper = mountForm({
      components: [
        {
          uuid: 'c-1',
          title: 'Bastion',
          type: 'software',
          description: '',
          status: { state: '' },
        },
        {
          uuid: 'c-2',
          title: '',
          type: '',
          description: '',
          status: { state: 'operational' },
        },
      ],
      inventoryItems: [{ uuid: 'i-1', description: '' }],
    } as POAMLocalDefinitions);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = (
      api.put.mock.calls.at(-1) as unknown as [string, POAMLocalDefinitions]
    )[1];
    expect(body.components).toEqual([
      expect.objectContaining({
        uuid: 'c-1',
        status: { state: 'operational' },
      }),
    ]);
    expect(body.inventoryItems).toEqual([]);
  });
});
