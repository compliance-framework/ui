import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type { SystemImplementation } from '@/oscal';
import SystemImplementationOverviewModalForm from '../SystemImplementationOverviewModalForm.vue';

enableAutoUnmount(afterEach);

const saveSystemImplementation = vi.fn();

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: ref(undefined),
    execute: saveSystemImplementation,
    isLoading: ref(false),
  })),
  decamelizeKeys: (data: unknown) => data,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

const DrawerStub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
});

const implementation = {
  users: [],
  components: [],
  remarks: '',
  props: [{ name: 'type', value: 'saas' }],
  links: [],
} as unknown as SystemImplementation;

function mountForm() {
  return mount(SystemImplementationOverviewModalForm, {
    props: { sspId: 'ssp-1', systemImplementation: implementation },
    global: {
      plugins: [[PrimeVue, { unstyled: true }]],
      stubs: { V2EditorDrawer: DrawerStub },
    },
  });
}

async function addProperty(wrapper: ReturnType<typeof mountForm>) {
  const add = wrapper
    .findAll('button')
    .find((b) => b.text().includes('ADD PROPERTY'))!;
  await add.trigger('click');
}

const field = (wrapper: ReturnType<typeof mountForm>, id: string) =>
  wrapper.find(`#${id}`);

describe('SystemImplementationOverviewModalForm', () => {
  beforeEach(() => {
    saveSystemImplementation.mockReset().mockResolvedValue(undefined);
  });

  it('drops a property row left empty instead of saving it', async () => {
    const wrapper = mountForm();
    await addProperty(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(saveSystemImplementation).toHaveBeenCalledTimes(1);
    const [, config] = saveSystemImplementation.mock.calls[0]!;
    expect(config.data.props).toEqual([{ name: 'type', value: 'saas' }]);
  });

  it('blocks saving a property with a value but no name', async () => {
    const wrapper = mountForm();
    await addProperty(wrapper);
    await field(wrapper, 'implementation-property-value-1').setValue('orphan');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(saveSystemImplementation).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      'Property 2 needs both a name and a value.',
    );
  });

  it('allows saving with empty remarks (optional in OSCAL)', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(saveSystemImplementation).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('REMARKS *');
  });
});
