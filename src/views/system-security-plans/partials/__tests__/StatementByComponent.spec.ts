import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import StatementByComponent from '@/views/system-security-plans/partials/StatementByComponent.vue';
import type { ByComponent, Statement, SystemSecurityPlan } from '@/oscal';

const execute = vi.fn(async () => ({
  data: { value: { data: { uuid: 'component-1', title: 'Component One' } } },
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(undefined),
    execute,
    isLoading: ref(false),
    error: ref(null),
  }),
}));

const stubs = {
  SecondaryButton: {
    template: '<button><slot /></button>',
  },
};

const statement = { uuid: 'statement-1' } as Statement;
const byComponent = {
  uuid: 'by-component-1',
  componentUuid: 'component-1',
  description: 'Implemented by component',
} as ByComponent;

describe('StatementByComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch a component until the SSP uuid is available', async () => {
    const wrapper = mount(StatementByComponent, {
      props: {
        ssp: {} as SystemSecurityPlan,
        statement,
        byComponent,
      },
      global: { stubs },
    });

    expect(execute).not.toHaveBeenCalled();

    await wrapper.setProps({
      ssp: { uuid: 'ssp-1' } as SystemSecurityPlan,
    });

    expect(execute).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/components/component-1',
    );
  });
});
