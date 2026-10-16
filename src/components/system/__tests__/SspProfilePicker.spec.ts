import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import SspProfilePicker from '../SspProfilePicker.vue';

const listProfiles = vi.fn();
const addProfile = vi.fn();
const removeProfile = vi.fn();

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    listProfiles,
    addProfile,
    removeProfile,
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([
      { uuid: 'p-1', metadata: { title: 'Moderate' } },
      { uuid: 'p-2', metadata: { title: 'High' } },
    ]),
    isLoading: ref(false),
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

const MultiSelectStub = {
  name: 'MultiSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="multiselect" :data-value="modelValue.join(\',\')" />',
};

function mountPicker() {
  return mount(SspProfilePicker, {
    props: { sspId: 'ssp-1' },
    global: { stubs: { MultiSelect: MultiSelectStub } },
  });
}

describe('SspProfilePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfiles.mockResolvedValue({ data: [{ uuid: 'p-1' }] });
  });

  it('shows the profiles already attached to the system', async () => {
    const wrapper = mountPicker();
    await flushPromises();

    expect(listProfiles).toHaveBeenCalledWith('ssp-1');
    const select = wrapper.findComponent(MultiSelectStub);
    expect(select.props('modelValue')).toEqual(['p-1']);
    expect(select.props('options')).toEqual([
      { name: 'Moderate', value: 'p-1' },
      { name: 'High', value: 'p-2' },
    ]);
  });

  it('attaches and detaches profiles, then reports the new set', async () => {
    const wrapper = mountPicker();
    await flushPromises();

    await wrapper
      .findComponent(MultiSelectStub)
      .vm.$emit('update:modelValue', ['p-2']);
    await flushPromises();

    expect(addProfile).toHaveBeenCalledWith('ssp-1', 'p-2');
    expect(removeProfile).toHaveBeenCalledWith('ssp-1', 'p-1');
    expect(wrapper.emitted('updated')).toEqual([[['p-2']]]);
  });
});
