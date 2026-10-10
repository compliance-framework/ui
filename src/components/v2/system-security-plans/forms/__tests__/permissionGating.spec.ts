import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type { Statement } from '@/oscal';
import StatementModalForm from '../StatementModalForm.vue';

enableAutoUnmount(afterEach);

const execute = vi.fn();
const can = vi.fn<(resource: string, action: string) => boolean>(() => false);

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => can(resource, action),
    permissionTooltip: (resource: string, action: string) =>
      `no ${action} on ${resource}`,
  }),
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: ref(undefined),
    execute,
    isLoading: ref(false),
  })),
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

// Exposes the submit gating the form hands to the drawer.
const DrawerStub = defineComponent({
  name: 'V2EditorDrawer',
  props: ['disableSubmit', 'disabledReason'],
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
});

const existing = {
  uuid: 'stmt-1',
  statementId: 'ac-2_smt',
  description: '',
  props: [],
  links: [],
  byComponents: [],
  responsibleRoles: [],
  remarks: '',
} as Statement;

function mountForm(statement?: Statement) {
  return mount(StatementModalForm, {
    props: {
      sspId: 'ssp-1',
      reqId: 'req-1',
      statement,
      suggestedStatementId: 'ac-2_smt',
    },
    global: {
      plugins: [[PrimeVue, { unstyled: true }]],
      stubs: { V2EditorDrawer: DrawerStub },
    },
  });
}

describe('V2 SSP form permission gating', () => {
  it('disables saving an existing statement without ssp:update', async () => {
    const wrapper = mountForm(existing);
    const drawer = wrapper.findComponent(DrawerStub);

    expect(can).toHaveBeenCalledWith('ssp', 'update');
    expect(drawer.props('disableSubmit')).toBe(true);
    expect(drawer.props('disabledReason')).toBe('no update on ssp');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(execute).not.toHaveBeenCalled();
  });

  it('checks ssp:create when creating', () => {
    const wrapper = mountForm();

    expect(can).toHaveBeenCalledWith('ssp', 'create');
    expect(wrapper.findComponent(DrawerStub).props('disableSubmit')).toBe(true);
  });

  it('enables saving with permission', () => {
    can.mockReturnValue(true);
    const wrapper = mountForm(existing);
    const drawer = wrapper.findComponent(DrawerStub);

    expect(drawer.props('disableSubmit')).toBe(false);
    expect(drawer.props('disabledReason')).toBe('');
  });
});
