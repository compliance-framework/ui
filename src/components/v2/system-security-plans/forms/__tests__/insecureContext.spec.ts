import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import StatementModalForm from '../StatementModalForm.vue';

enableAutoUnmount(afterEach);

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: ref(undefined),
    execute: vi.fn(),
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

const DrawerStub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
});

describe('V2 SSP forms outside a secure context', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Plain-HTTP, non-localhost deployments have no crypto.randomUUID (M0-03).
  it('mounts and mints ids without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues });

    const wrapper = mount(StatementModalForm, {
      props: {
        sspId: 'ssp-1',
        reqId: 'req-1',
        suggestedStatementId: 'ac-2_smt',
      },
      global: {
        plugins: [[PrimeVue, { unstyled: true }]],
        stubs: { V2EditorDrawer: DrawerStub },
      },
    });

    expect(wrapper.find('form').attributes('id')).toMatch(
      /^statement-form-[0-9a-f-]{36}$/,
    );
  });
});
