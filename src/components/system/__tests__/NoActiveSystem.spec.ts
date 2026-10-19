import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import {
  useSystemStore,
  type PartialSystemSecurityPlan,
} from '@/stores/system';
import NoActiveSystem from '../NoActiveSystem.vue';

const permission = { canCreate: true };

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) =>
      resource === 'ssp' && action === 'create' ? permission.canCreate : true,
  }),
}));

function mountEmptyState() {
  return mount(NoActiveSystem, {
    props: { subject: 'risks' },
    global: {
      stubs: {
        RouterLinkButton: {
          props: ['to'],
          template: '<a class="link-button" :data-route="to.name"><slot /></a>',
        },
      },
    },
  });
}

function plan(uuid: string): PartialSystemSecurityPlan {
  return { uuid, metadata: { title: uuid } } as PartialSystemSecurityPlan;
}

describe('NoActiveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    permission.canCreate = true;
  });

  it('asks the user to select a system while the list is still loading', () => {
    const wrapper = mountEmptyState();

    expect(wrapper.text()).toContain('Select a system');
    expect(wrapper.text()).toContain("show that system's risks");
    expect(wrapper.find('[data-route="system-security-plans"]').exists()).toBe(
      true,
    );
  });

  it('asks the user to select a system when systems exist', () => {
    // Two plans, so the store doesn't auto-select one.
    useSystemStore().setAvailablePlans([plan('ssp-1'), plan('ssp-2')]);

    const wrapper = mountEmptyState();

    expect(wrapper.text()).toContain('Select a system');
    expect(wrapper.text()).not.toContain('Create your first system');
  });

  it('offers to create the first system when none exist', () => {
    useSystemStore().setAvailablePlans([]);

    const wrapper = mountEmptyState();

    expect(wrapper.text()).toContain('Create your first system');
    expect(
      wrapper.find('[data-route="system-security-plans-create"]').exists(),
    ).toBe(true);
  });

  it('points users who cannot create systems to an administrator', () => {
    permission.canCreate = false;
    useSystemStore().setAvailablePlans([]);

    const wrapper = mountEmptyState();

    expect(wrapper.text()).toContain('Create your first system');
    expect(wrapper.text()).toContain('Ask an administrator');
    expect(
      wrapper.find('[data-route="system-security-plans-create"]').exists(),
    ).toBe(false);
  });
});
