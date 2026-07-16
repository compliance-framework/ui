import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ExportOfferingsPanel from '../ExportOfferingsPanel.vue';

const { fetchedUrls, permState, responses } = vi.hoisted(() => ({
  fetchedUrls: [] as string[],
  permState: { can: true },
  // url -> payload to resolve with, or an Error to reject with.
  responses: new Map<string, unknown>(),
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
      // Mirrors vueuse's `useAxios` with its default `resetOnExecute: false`: `data` keeps
      // the PREVIOUS response until a successful one replaces it, and a rejected execute
      // leaves it untouched. That is the behaviour the stale-data bug turned on.
      const execute = (url: string) => {
        fetchedUrls.push(url);
        const canned = responses.get(url);
        if (canned instanceof Error) return Promise.reject(canned);
        if (canned !== undefined) data.value = canned;
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
    responses.clear();
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

  // The URL half of the KeepAlive staleness trap was fixed by the computed URLs above; this
  // is the data half. `useAxios` keeps the previous `data` until a SUCCESSFUL response
  // replaces it, so a failed refetch after an SSP switch would leave A's offerings rendered
  // under B — while publish()/updateStatus() interpolate B's id into the mutation URL.
  it('does not render the previous SSP’s offerings when the new SSP’s fetch fails', async () => {
    responses.set('/api/oscal/system-security-plans/ssp-1/export-offerings', [
      {
        id: 'off-a',
        title: 'Alpha Offering',
        description: '',
        version: 1,
        status: 'draft',
        contentHash: '',
        createdAt: '',
        updatedAt: '',
        items: [],
      },
    ]);
    responses.set(
      '/api/oscal/system-security-plans/ssp-2/export-offerings',
      new Error('boom'),
    );

    const wrapper = mount(ExportOfferingsPanel, {
      props: { sspId: 'ssp-1' },
      global: { stubs },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Alpha Offering');

    await wrapper.setProps({ sspId: 'ssp-2' });
    await flushPromises();

    expect(wrapper.text()).not.toContain('Alpha Offering');
    expect(wrapper.text()).toContain('No export offerings yet');
  });
});
