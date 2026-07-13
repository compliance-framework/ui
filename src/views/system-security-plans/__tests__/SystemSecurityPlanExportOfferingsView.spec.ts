import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SystemSecurityPlanExportOfferingsView from '../SystemSecurityPlanExportOfferingsView.vue';
import type { SSPExportOffering } from '@/types/ssp-export-offerings';

const {
  postMock,
  putMock,
  patchMock,
  toastAddMock,
  confirmRequireMock,
  permState,
  offeringsData,
} = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  toastAddMock: vi.fn(),
  confirmRequireMock: vi.fn(),
  permState: { can: true },
  offeringsData: { current: [] as SSPExportOffering[] },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ssp-1' } }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequireMock }),
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
    useDataApi: (url: string) => {
      if (url.endsWith('/export-offerings')) {
        return { data: ref(offeringsData.current), isLoading: ref(false) };
      }
      return { data: ref(undefined), isLoading: ref(false) };
    },
    useAuthenticatedInstance: () => ({
      post: postMock,
      put: putMock,
      patch: patchMock,
    }),
  };
});

const stubs = {
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
  Badge: {
    props: ['severity'],
    template: '<span :data-severity="severity"><slot /></span>',
  },
  PrimaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Label: { template: '<label><slot /></label>' },
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: '<select />',
  },
};

function makeOffering(
  overrides: Partial<SSPExportOffering> = {},
): SSPExportOffering {
  return {
    id: 'offering-1',
    sspId: 'ssp-1',
    title: 'My Offering',
    description: 'A useful offering',
    version: 0,
    status: 'draft',
    contentHash: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  };
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

function mountView() {
  return mount(SystemSecurityPlanExportOfferingsView, { global: { stubs } });
}

describe('SystemSecurityPlanExportOfferingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    offeringsData.current = [];
    postMock.mockResolvedValue({ data: { data: {} } });
    putMock.mockResolvedValue({ data: { data: {} } });
    patchMock.mockResolvedValue({ data: { data: {} } });
  });

  it('renders an empty state when there are no offerings', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain(
      'No export offerings yet. Click "Create Offering" to get started.',
    );
  });

  it('renders an offering with its status badge, version, and publishedAt', () => {
    offeringsData.current = [
      makeOffering({
        status: 'published',
        version: 3,
        publishedAt: '2026-02-01T00:00:00Z',
      }),
    ];
    const wrapper = mountView();
    expect(wrapper.text()).toContain('My Offering');
    expect(wrapper.text()).toContain('published');
    expect(wrapper.text()).toContain('v3');
    expect(wrapper.text()).toContain('Published');
  });

  it('shows "Not yet published" for a draft offering', () => {
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    expect(wrapper.text()).toContain('Not yet published');
  });

  it('creates an offering and adds it to the list', async () => {
    postMock.mockResolvedValueOnce({
      data: { data: makeOffering({ id: 'new-offering', title: 'New One' }) },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Create Offering').trigger('click');
    await wrapper.find('input').setValue('New One');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings',
      { title: 'New One', description: '' },
    );
    expect(wrapper.text()).toContain('New One');
  });

  it('edits an offering and reflects the change in the list', async () => {
    offeringsData.current = [makeOffering()];
    putMock.mockResolvedValueOnce({
      data: { data: makeOffering({ title: 'Renamed Offering' }) },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Edit').trigger('click');
    const inputs = wrapper.findAll('input');
    await inputs.at(-1)!.setValue('Renamed Offering');
    const forms = wrapper.findAll('form');
    await forms.at(-1)!.trigger('submit');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1',
      { title: 'Renamed Offering', description: 'A useful offering' },
    );
    expect(wrapper.text()).toContain('Renamed Offering');
  });

  it('publishes a draft offering and updates status/version/publishedAt in place', async () => {
    offeringsData.current = [makeOffering()];
    postMock.mockResolvedValueOnce({
      data: {
        data: makeOffering({
          status: 'published',
          version: 1,
          publishedAt: '2026-03-01T00:00:00Z',
        }),
      },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Publish').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/publish',
    );
    expect(wrapper.text()).toContain('published');
    expect(wrapper.text()).toContain('v1');
  });

  it('shows Republish for an already-published offering', () => {
    offeringsData.current = [makeOffering({ status: 'published' })];
    const wrapper = mountView();
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).toContain('Republish');
    expect(buttonTexts).not.toContain('Publish');
  });

  it('deprecates a published offering after confirmation', async () => {
    offeringsData.current = [makeOffering({ status: 'published' })];
    patchMock.mockResolvedValueOnce({
      data: { data: makeOffering({ status: 'deprecated' }) },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Deprecate').trigger('click');
    expect(confirmRequireMock).toHaveBeenCalled();

    const { accept } = confirmRequireMock.mock.calls[0][0];
    await accept();
    await flushPromises();

    expect(patchMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/status',
      { status: 'deprecated' },
    );
    expect(wrapper.text()).toContain('deprecated');
  });

  it('revokes a published offering after confirmation', async () => {
    offeringsData.current = [makeOffering({ status: 'published' })];
    patchMock.mockResolvedValueOnce({
      data: { data: makeOffering({ status: 'revoked' }) },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Revoke').trigger('click');
    const { accept } = confirmRequireMock.mock.calls[0][0];
    await accept();
    await flushPromises();

    expect(patchMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/status',
      { status: 'revoked' },
    );
    expect(wrapper.text()).toContain('revoked');
  });

  it('hides Deprecate/Revoke for a draft offering and Publish for a revoked one', () => {
    offeringsData.current = [makeOffering({ status: 'revoked' })];
    const wrapper = mountView();
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Publish');
    expect(buttonTexts).not.toContain('Republish');
    expect(buttonTexts).not.toContain('Deprecate');
    expect(buttonTexts).not.toContain('Revoke');
  });

  it('hides Create/Edit/Publish/Deprecate/Revoke without the corresponding permission', () => {
    permState.can = false;
    offeringsData.current = [makeOffering({ status: 'published' })];
    const wrapper = mountView();
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Create Offering');
    expect(buttonTexts).not.toContain('Edit');
    expect(buttonTexts).not.toContain('Republish');
    expect(buttonTexts).not.toContain('Deprecate');
    expect(buttonTexts).not.toContain('Revoke');
  });
});
