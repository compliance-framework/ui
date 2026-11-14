import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import type { InventoryItem } from '@/oscal';
import InventoryItemRelationsForm from '../InventoryItemRelationsForm.vue';

const api = vi.hoisted(() => ({
  put: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
}));
const lists: Record<string, unknown[]> = {
  components: [{ uuid: 'comp-1', title: 'API gateway' }],
  parties: [{ uuid: 'party-1', name: 'Platform team' }],
  roles: [{ id: 'owner', title: 'Owner' }],
};
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: (url: string) => ({
    data: ref(lists[url.split('/').pop()!]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

const item: InventoryItem = {
  uuid: 'item-1',
  description: 'Database server',
  implementedComponents: [{ componentUuid: 'comp-gone', remarks: '' }],
  responsibleParties: [],
  props: [{ name: 'asset-type', value: 'database' }],
  links: [],
};

function mountForm() {
  const saved: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(InventoryItemRelationsForm, {
            sspId: 'ssp-1',
            item,
            onSaved: (i: unknown) => saved.push(i),
          }),
        ),
    }),
    { attachTo: document.body },
  );
  return { wrapper, saved };
}

describe('InventoryItemRelationsForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.put.mockReset().mockResolvedValue({ data: { data: item } });
  });

  it("keeps a saved component the plan doesn't list, by its ID", () => {
    const { wrapper } = mountForm();
    const options = wrapper.findAll('option').map((o) => o.text());
    expect(options).toContain('API gateway');
    expect(options).toContain('comp-gone');
    wrapper.unmount();
  });

  it('saves components and responsibilities, dropping incomplete rows', async () => {
    const { wrapper, saved } = mountForm();
    const add = (text: string) =>
      wrapper.findAll('button').find((b) => b.text().startsWith(text))!;
    await add('Add component').trigger('click');
    await add('Add responsibility').trigger('click');
    const selects = wrapper.findAll('select');
    await selects[1]!.setValue('comp-1');
    await selects[2]!.setValue('owner');
    const party = wrapper
      .findAll('label')
      .find((l) => l.text() === 'Platform team')!;
    await wrapper.find(`[id="${party.attributes('for')}"]`).setValue(true);
    await add('Add property').trigger('click');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [url, body] = api.put.mock.calls[0]!;
    expect(url).toBe(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/inventory-items/item-1',
    );
    expect(body).toEqual(
      expect.objectContaining({
        description: 'Database server',
        implementedComponents: [
          { componentUuid: 'comp-gone', remarks: undefined },
          { componentUuid: 'comp-1', remarks: undefined },
        ],
        responsibleParties: [
          { roleId: 'owner', partyUuids: ['party-1'], remarks: undefined },
        ],
        props: [{ name: 'asset-type', value: 'database' }],
      }),
    );
    expect(saved).toEqual([item]);
    wrapper.unmount();
  });

  it('shows a failed save in the form', async () => {
    api.put.mockRejectedValueOnce({
      response: { status: 500, data: { errors: { body: 'Boom' } } },
    });
    const { wrapper } = mountForm();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Boom');
    wrapper.unmount();
  });
});
