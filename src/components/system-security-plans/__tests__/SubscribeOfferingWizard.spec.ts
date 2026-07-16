import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SubscribeOfferingWizard from '../SubscribeOfferingWizard.vue';
import type { CatalogOffering } from '@/types/ssp-export-offerings';

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: vi.fn() }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

const stubs = {
  Message: { template: '<div class="message"><slot /></div>' },
  PrimaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type ?? \'button\'" :disabled="disabled"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
};

// `responsibilities` is deliberately loose: the point of these cases is the payload the
// API really sends (`null`), which the type is meant to keep unreachable.
function makeOffering(responsibilities: unknown): CatalogOffering {
  return {
    id: 'off-1',
    sspId: 'ssp-up',
    title: 'Platform Baseline',
    description: '',
    version: 1,
    status: 'published',
    contentHash: '',
    createdAt: '',
    updatedAt: '',
    items: [
      {
        id: 'item-1',
        offeringId: 'off-1',
        controlId: 'AC-2',
        statementId: 'AC-2_smt.a',
        componentUuid: 'c',
        providedUuid: 'p-1',
        responsibilities: responsibilities as never,
      },
    ],
  };
}

describe('SubscribeOfferingWizard', () => {
  // A Go nil slice marshals to `null`, not `[]`. Preselection makes the deref reachable on
  // the first render, and SharedResponsibilityPanel always passes preselectedItemIds — so
  // an unguarded `.length` throws out of mount() and blank-screens the whole dialog.
  it('mounts a preselected item whose responsibilities came back as null', () => {
    const wrapper = mount(SubscribeOfferingWizard, {
      props: {
        sspId: 'ssp-down',
        offering: makeOffering(null),
        preselectedItemIds: ['item-1'],
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('AC-2 · Statement AC-2_smt.a');
    // The item renders; there is simply nothing to tick.
    expect(wrapper.text()).not.toContain('We already handle this');
  });

  it('lists responsibilities of a preselected item when the API sends them', () => {
    const wrapper = mount(SubscribeOfferingWizard, {
      props: {
        sspId: 'ssp-down',
        offering: makeOffering([
          { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
        ]),
        preselectedItemIds: ['item-1'],
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('We already handle this');
    expect(wrapper.text()).toContain('Rotate your own keys');
  });
});
