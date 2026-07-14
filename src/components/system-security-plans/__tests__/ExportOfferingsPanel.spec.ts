import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ExportOfferingsPanel from '../ExportOfferingsPanel.vue';

const { fetchedUrls, permState } = vi.hoisted(() => ({
  fetchedUrls: [] as string[],
  permState: { can: true },
}));

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: () => {
      const data = ref<unknown>(undefined);
      const execute = (url: string) => {
        fetchedUrls.push(url);
        return Promise.resolve({ data: ref({ data: data.value }) });
      };
      return { data, isLoading: ref(false), execute };
    },
    useAuthenticatedInstance: () => ({
      get: vi.fn(async () => ({ data: { data: [] } })),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }),
  };
});

const stubs = {
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
  Badge: { template: '<span><slot /></span>' },
  PrimaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ExportOfferingCreateForm: { template: '<div />' },
  ExportOfferingEditForm: { template: '<div />' },
  ExportOfferingItemsDialog: { template: '<div />' },
  ExportOfferingAllowlistDialog: { template: '<div />' },
};

describe('ExportOfferingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchedUrls.length = 0;
    permState.can = true;
  });

  // Regression: the offerings view used to build its URL from sspId once, at setup, while its
  // tab host keeps it alive across SSP switches — so switching SSPs rendered stale data.
  it('refetches against the new SSP when sspId changes', async () => {
    const wrapper = mount(ExportOfferingsPanel, {
      props: { sspId: 'ssp-1' },
      global: { stubs },
    });
    await flushPromises();

    expect(fetchedUrls).toContain(
      '/api/oscal/system-security-plans/ssp-1/export-offerings',
    );

    await wrapper.setProps({ sspId: 'ssp-2' });
    await flushPromises();

    expect(fetchedUrls).toContain(
      '/api/oscal/system-security-plans/ssp-2/export-offerings',
    );
  });
});
