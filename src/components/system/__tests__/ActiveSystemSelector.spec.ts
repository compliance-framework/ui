import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSystemStore } from '@/stores/system';
import ActiveSystemSelector from '../ActiveSystemSelector.vue';

const get = vi.fn();

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

const SelectStub = {
  name: 'Select',
  props: ['modelValue', 'options', 'placeholder'],
  emits: ['update:modelValue', 'show'],
  template: `<div class="select-stub" :data-value="modelValue" :data-placeholder="placeholder">
      <button v-for="option in options" :key="option.uuid" class="option" @click="$emit('update:modelValue', option.uuid)">{{ option.title }}</button>
      <slot name="footer" />
    </div>`,
};

function mountSelector() {
  return mount(ActiveSystemSelector, {
    global: {
      stubs: {
        Select: SelectStub,
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
}

describe('ActiveSystemSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    get.mockReset();
  });

  it('loads the systems and switches the active one on selection', async () => {
    get.mockResolvedValue({
      data: {
        data: [
          { uuid: 'ssp-1', metadata: { title: 'Payments' } },
          { uuid: 'ssp-2', metadata: { title: 'Identity' } },
        ],
      },
    });

    const wrapper = mountSelector();
    await flushPromises();

    expect(get).toHaveBeenCalledWith('/api/oscal/system-security-plans');
    const options = wrapper.findAll('.option');
    expect(options.map((option) => option.text())).toEqual([
      'Payments',
      'Identity',
    ]);
    expect(wrapper.find('.select-stub').attributes('data-placeholder')).toBe(
      'Select a system',
    );

    await options[1].trigger('click');
    expect(useSystemStore().system.securityPlan?.uuid).toBe('ssp-2');
  });

  it('offers system management and creation from the menu', async () => {
    get.mockResolvedValue({ data: { data: [] } });

    const wrapper = mountSelector();
    await flushPromises();

    expect(wrapper.text()).toContain('Manage systems');
    expect(wrapper.text()).toContain('New system');
    expect(wrapper.find('.select-stub').attributes('data-placeholder')).toBe(
      'No systems yet',
    );
  });
});
