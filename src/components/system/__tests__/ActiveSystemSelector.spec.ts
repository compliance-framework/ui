import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSystemStore } from '@/stores/system';
import { usePermissionsStore } from '@/stores/permissions';
import ActiveSystemSelector from '../ActiveSystemSelector.vue';

const get = vi.fn();

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get }),
}));

const permission = { canRead: true };

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) =>
      resource === 'ssp' && action === 'read' ? permission.canRead : true,
  }),
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
    permission.canRead = true;
    // Permissions already loaded, as after a login (no hydrate request needed).
    usePermissionsStore().loaded = true;
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

  it('hides the switcher and never lists systems without ssp:read', async () => {
    permission.canRead = false;

    const wrapper = mountSelector();
    await flushPromises();

    expect(get).not.toHaveBeenCalled();
    expect(wrapper.find('.select-stub').exists()).toBe(false);
  });

  it('waits for permissions to load before listing systems', async () => {
    const permissionsStore = usePermissionsStore();
    permissionsStore.loaded = false;
    let finishHydrate!: () => void;
    const hydrate = vi.spyOn(permissionsStore, 'hydrate').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishHydrate = () => {
            permissionsStore.loaded = true;
            resolve(undefined);
          };
        }),
    );
    get.mockResolvedValue({ data: { data: [] } });

    mountSelector();
    await flushPromises();
    expect(hydrate).toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();

    finishHydrate();
    await flushPromises();
    expect(get).toHaveBeenCalledWith('/api/oscal/system-security-plans');
  });
});
