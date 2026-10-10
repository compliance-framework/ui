import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { usePermissionsStore } from '@/stores/permissions';

function mountGate() {
  return mount(PermissionGate, {
    props: { resource: 'risk', action: 'create' },
    slots: {
      default: '<span class="allowed">allowed</span>',
      fallback: '<span class="denied">denied</span>',
    },
  });
}

describe('PermissionGate', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the default slot when permitted', () => {
    const store = usePermissionsStore();
    store.permissions = { risk: ['create'] };
    store.loaded = true;

    const wrapper = mountGate();
    expect(wrapper.find('.allowed').exists()).toBe(true);
    expect(wrapper.find('.denied').exists()).toBe(false);
  });

  it('renders the fallback slot when denied', () => {
    const store = usePermissionsStore();
    store.permissions = { risk: ['read'] };
    store.loaded = true;

    const wrapper = mountGate();
    expect(wrapper.find('.allowed').exists()).toBe(false);
    expect(wrapper.find('.denied').exists()).toBe(true);
  });
});
