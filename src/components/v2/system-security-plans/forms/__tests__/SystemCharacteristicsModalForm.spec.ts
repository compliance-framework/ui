import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type { SystemCharacteristics } from '@/oscal';
import SystemCharacteristicsModalForm from '../SystemCharacteristicsModalForm.vue';

enableAutoUnmount(afterEach);

const save = vi.fn();

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: ref(undefined),
    execute: save,
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

const characteristics = {
  systemName: 'IFA GoodRead',
  systemNameShort: 'GR',
  securitySensitivityLevel: 'moderate',
  description: 'Link shortener',
  remarks: '',
  status: { state: 'operational' },
  systemIds: [{ id: 'sys-1', identifierType: 'http://ietf.org/rfc/rfc4122' }],
  systemInformation: {
    informationTypes: [{ uuid: 'it-1', title: 'Link data' }],
  },
} as unknown as SystemCharacteristics;

function mountForm() {
  return mount(SystemCharacteristicsModalForm, {
    props: { sspId: 'ssp-1', characteristics },
    global: {
      plugins: [[PrimeVue, { unstyled: true }]],
      stubs: { V2EditorDrawer: DrawerStub },
    },
  });
}

describe('SystemCharacteristicsModalForm', () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue(undefined);
  });

  it('sends the full characteristics with the edits, keeping associations', async () => {
    const wrapper = mountForm();
    await wrapper.find('#system-characteristics-name').setValue('GoodRead v2');
    await wrapper
      .find('#system-characteristics-remarks')
      .setValue('Now tracked');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [url, config] = save.mock.calls[0]!;
    expect(url).toBe(
      '/api/oscal/system-security-plans/ssp-1/system-characteristics',
    );
    expect(config.data).toMatchObject({
      systemName: 'GoodRead v2',
      remarks: 'Now tracked',
      systemNameShort: 'GR',
      status: { state: 'operational' },
      systemIds: characteristics.systemIds,
      systemInformation: characteristics.systemInformation,
    });
  });

  it('requires a system name and description', async () => {
    const wrapper = mountForm();
    await wrapper.find('#system-characteristics-name').setValue('');
    await wrapper.find('#system-characteristics-description').setValue(' ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('System name is required.');
    expect(wrapper.text()).toContain('Description is required.');
  });

  it("explains that a set optional field can't be cleared", async () => {
    const wrapper = mountForm();
    await wrapper.find('#system-characteristics-short-name').setValue('');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Short name can't be cleared yet");
  });
});
