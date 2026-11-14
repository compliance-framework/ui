import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import InventoryItemCreateForm from '../InventoryItemCreateForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  urls: [] as string[],
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: (url: string) => {
    api.urls.push(url);
    const data = ref<unknown>([
      { uuid: 'doc-1', metadata: { title: 'First document' } },
    ]);
    return {
      data,
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      response: ref(undefined),
      execute: vi.fn((next: string) => {
        api.urls.push(next);
        return Promise.resolve();
      }),
    };
  },
}));

function mountForm(sspId?: string) {
  const created: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(InventoryItemCreateForm, {
            sspId,
            onCreated: (item: unknown) => created.push(item),
          }),
        ),
    }),
  );
  return { wrapper, created };
}

const field = (wrapper: ReturnType<typeof mount>, label: string) => {
  const el = wrapper
    .findAll('label')
    .find((l) => l.text().replace('*', '').trim() === label)!;
  return wrapper.find(`[id="${el.attributes('for')}"]`);
};

describe('InventoryItemCreateForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.post.mockReset().mockResolvedValue({ data: { data: { uuid: 'new' } } });
    api.urls = [];
  });

  it("goes to the system's own plan by default, without asking which", async () => {
    const { wrapper, created } = mountForm('ssp-1');
    expect(
      (field(wrapper, 'Destination').element as HTMLSelectElement).value,
    ).toBe('ssp');
    expect(wrapper.text()).not.toContain('Security plan');
    await field(wrapper, 'Description').setValue('Database server');
    await field(wrapper, 'Asset type').setValue('database');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/inventory');
    expect(body).toEqual({
      destination: 'ssp',
      destination_id: 'ssp-1',
      inventory_item: expect.objectContaining({
        description: 'Database server',
        props: [{ name: 'asset-type', value: 'database' }],
      }),
    });
    expect(created).toEqual([{ uuid: 'new' }]);
  });

  it('requires a description', async () => {
    const { wrapper } = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a description.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('requires a security plan when one has to be chosen', async () => {
    const { wrapper } = mountForm();
    await field(wrapper, 'Destination').setValue('ssp');
    await field(wrapper, 'Description').setValue('x');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose a security plan.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('lets a POA&M be left unspecified, listing the POA&Ms', async () => {
    const { wrapper } = mountForm();
    await field(wrapper, 'Destination').setValue('poam');
    expect(api.urls).toContain('/api/oscal/plan-of-action-and-milestones');
    expect(wrapper.text()).toContain('First document');
    await field(wrapper, 'Description').setValue('Planned host');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ destination: 'poam', destination_id: '' }),
    );
  });

  it('shows a failed create in the form', async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 400, data: { errors: { body: 'Bad item' } } },
    });
    const { wrapper } = mountForm();
    await field(wrapper, 'Description').setValue('x');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Bad item');
  });
});
