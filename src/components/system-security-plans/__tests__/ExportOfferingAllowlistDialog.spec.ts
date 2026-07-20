import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ExportOfferingAllowlistDialog from '../ExportOfferingAllowlistDialog.vue';
import type { AllowedDownstream } from '@/types/ssp-export-offerings';

const { getMock, postMock, deleteMock, toastAddMock, permState } = vi.hoisted(
  () => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    deleteMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { can: true },
  }),
);

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
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
    // The SSP list feeds the downstream picker.
    useDataApi: () =>
      ({
        data: ref([
          { uuid: 'ssp-1', metadata: { title: 'Upstream SSP' } },
          { uuid: 'ssp-2', metadata: { title: 'Downstream One' } },
          { uuid: 'ssp-3', metadata: { title: 'Downstream Two' } },
        ]),
        isLoading: ref(false),
      }) as never,
    useAuthenticatedInstance: () => ({
      get: getMock,
      post: postMock,
      delete: deleteMock,
    }),
  };
});

const stubs = {
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.id" :value="o.id">{{ o.label }}</option></select>',
  },
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div class="message"><slot /></div>' },
  PrimaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
};

const ALLOWLIST_URL =
  '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/allowed-downstreams';

function mountDialog() {
  return mount(ExportOfferingAllowlistDialog, {
    props: { sspId: 'ssp-1', offeringId: 'offering-1' },
    global: { stubs },
  });
}

function findButton(wrapper: ReturnType<typeof mountDialog>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

const entry: AllowedDownstream = {
  id: 'allow-1',
  offeringId: 'offering-1',
  downstreamSspId: 'ssp-2',
};

describe('ExportOfferingAllowlistDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    getMock.mockResolvedValue({ data: { data: [] } });
    postMock.mockResolvedValue({ data: { data: entry } });
    deleteMock.mockResolvedValue({});
  });

  it('reads an empty allow-list as "any downstream may subscribe"', async () => {
    const wrapper = mountDialog();
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith(ALLOWLIST_URL);
    expect(wrapper.text()).toContain('Any downstream may subscribe');
  });

  // An empty `allowed` means "anybody may subscribe" — a security claim. A failed fetch
  // leaves it empty too, so without a load-error flag the dialog asserts a fact it does
  // not know, and the toast that said otherwise expires after 5s.
  it('never claims "any downstream may subscribe" when the allow-list failed to load', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'));
    const wrapper = mountDialog();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Any downstream may subscribe');
    expect(wrapper.text()).toContain('Could not load the allow-list');
    // Adding against an unknown list would re-offer already-allowed downstreams.
    expect(
      wrapper.findAll('button').some((b) => b.text() === 'Add Downstream'),
    ).toBe(false);
  });

  it('recovers the allow-list view on Retry', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'));
    const wrapper = mountDialog();
    await flushPromises();

    getMock.mockResolvedValueOnce({ data: { data: [entry] } });
    await findButton(wrapper, 'Retry').trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Could not load the allow-list');
    expect(wrapper.text()).toContain('Downstream One');
  });

  it('lists allowed downstreams by SSP title', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [entry] } });
    const wrapper = mountDialog();
    await flushPromises();

    expect(wrapper.text()).toContain('Downstream One');
    expect(wrapper.text()).not.toContain('Any downstream may subscribe');
  });

  it('adds a downstream', async () => {
    const wrapper = mountDialog();
    await flushPromises();

    await wrapper.find('select').setValue('ssp-2');
    await findButton(wrapper, 'Add Downstream').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(ALLOWLIST_URL, {
      downstreamSspId: 'ssp-2',
    });
    expect(wrapper.text()).toContain('Downstream One');
  });

  it('never offers the offering’s own SSP as its downstream', async () => {
    const wrapper = mountDialog();
    await flushPromises();

    const optionValues = wrapper
      .findAll('option')
      .map((o) => o.attributes('value'));
    expect(optionValues).toEqual(['ssp-2', 'ssp-3']);
  });

  it('removes a downstream by its ssp id', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [entry] } });
    const wrapper = mountDialog();
    await flushPromises();

    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(`${ALLOWLIST_URL}/ssp-2`);
    expect(wrapper.text()).toContain('Any downstream may subscribe');
  });

  it('hides Add/Remove without ssp:export', async () => {
    permState.can = false;
    getMock.mockResolvedValueOnce({ data: { data: [entry] } });
    const wrapper = mountDialog();
    await flushPromises();

    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Downstream');
    expect(buttonTexts).not.toContain('Remove');
  });
});
