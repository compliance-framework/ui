import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type { Statement } from '@/oscal';
import StatementModalForm from '../StatementModalForm.vue';

enableAutoUnmount(afterEach);

const persistStatement = vi.fn();
const persistedStatement = ref<Statement | undefined>();

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: persistedStatement,
    execute: persistStatement,
    isLoading: ref(false),
  })),
  decamelizeKeys: (data: unknown) => data,
}));

// Submit is gated on SSP permissions (backlog M1-13); grant them here.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => true,
    permissionTooltip: () => '',
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

// Render the drawer's content inline instead of in a PrimeVue overlay.
const DrawerStub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
});

const existing: Statement = {
  uuid: 'stmt-1',
  statementId: 'ac-2_smt',
  description: 'Existing description',
  props: [],
  links: [],
  byComponents: [],
  responsibleRoles: [],
  remarks: '',
};

const STATEMENT_ID = '#statement-id';

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

describe('StatementModalForm', () => {
  it('locks the statement ID when editing an existing statement', async () => {
    const wrapper = mountForm(existing);
    await flushPromises();

    const input = wrapper.find(STATEMENT_ID);
    expect(input.attributes('readonly')).toBeDefined();
    expect(wrapper.text()).toContain('It cannot be changed');
  });

  it('links the STATEMENT ID label to its input', async () => {
    const wrapper = mountForm(existing);
    await flushPromises();

    const label = wrapper.find('label[for="statement-id"]');
    expect(label.exists()).toBe(true);
    expect(wrapper.find(STATEMENT_ID).element.tagName).toBe('INPUT');
  });

  it('lets the statement ID be set when creating a statement', async () => {
    const wrapper = mountForm();
    await flushPromises();

    expect(wrapper.find(STATEMENT_ID).attributes('readonly')).toBeUndefined();
  });

  it('always saves an existing statement under its original ID', async () => {
    persistStatement.mockResolvedValue(undefined);
    persistedStatement.value = existing;
    const wrapper = mountForm(existing);
    await flushPromises();

    // Even if the value is changed programmatically, the PUT keeps the ID.
    await wrapper.find(STATEMENT_ID).setValue('ac-2_sm');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(persistStatement).toHaveBeenCalledWith(
      expect.stringContaining('/statements/stmt-1'),
      expect.objectContaining({
        method: 'PUT',
        data: expect.objectContaining({ statementId: 'ac-2_smt' }),
      }),
    );
  });
});
