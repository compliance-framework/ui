import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SystemSecurityPlanLeverageView from '../SystemSecurityPlanLeverageView.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { CatalogOffering } from '@/types/ssp-export-offerings';

const UPSTREAM_SCOPED_SSP_PATH = /system-security-plans\/(?!undefined)/;

const { postMock, toastAddMock, permState, offeringsData } = vi.hoisted(() => ({
  postMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { canSubscribe: true, canUpdateSsp: true },
  offeringsData: { current: [] as CatalogOffering[] },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ssp-downstream-1' } }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => {
      if (
        resource === RESOURCES.SSP_EXPORT_OFFERING &&
        action === ACTIONS.SUBSCRIBE
      ) {
        return permState.canSubscribe;
      }
      if (resource === RESOURCES.SSP && action === ACTIONS.UPDATE) {
        return permState.canUpdateSsp;
      }
      return true;
    },
    permissionTooltip: () => '',
  }),
}));

const fetchedUrls: string[] = [];
vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: (url: string) => {
      fetchedUrls.push(url);
      return { data: ref(offeringsData.current), isLoading: ref(false) };
    },
    useAuthenticatedInstance: () => ({ post: postMock }),
  };
});

const stubs = {
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
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
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div class="message"><slot /></div>' },
};

function makeOffering(
  overrides: Partial<CatalogOffering> = {},
): CatalogOffering {
  return {
    id: 'offering-1',
    sspId: 'ssp-upstream-1',
    title: 'GovCloud Baseline',
    description: 'A useful offering',
    version: 2,
    status: 'published',
    contentHash: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [
      {
        id: 'item-1',
        offeringId: 'offering-1',
        controlId: 'ac-1',
        componentUuid: 'comp-1',
        providedUuid: 'p-1',
        responsibilities: [
          { responsibilityUuid: 'r-1', description: 'Rotate credentials' },
        ],
      },
    ],
    ...overrides,
  };
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

function mountView() {
  return mount(SystemSecurityPlanLeverageView, { global: { stubs } });
}

describe('SystemSecurityPlanLeverageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.canSubscribe = true;
    permState.canUpdateSsp = true;
    offeringsData.current = [];
    fetchedUrls.length = 0;
    postMock.mockResolvedValue({ data: { data: [] } });
  });

  it('renders an empty state when there are no published offerings', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain(
      'No published export offerings available yet.',
    );
  });

  it('renders an offering with title, version, and item summary', () => {
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    expect(wrapper.text()).toContain('GovCloud Baseline');
    expect(wrapper.text()).toContain('v2');
    expect(wrapper.text()).toContain('1 item: ac-1');
  });

  it('never fetches anything upstream-scoped — only the flat catalog', () => {
    offeringsData.current = [makeOffering()];
    mountView();
    expect(fetchedUrls).toEqual(['/api/oscal/ssp-export-offerings']);
    for (const url of fetchedUrls) {
      expect(url).not.toContain('ssp-upstream-1');
      expect(url).not.toMatch(UPSTREAM_SCOPED_SSP_PATH);
    }
  });

  it('subscribes to selected items with satisfied responsibilities', async () => {
    offeringsData.current = [makeOffering()];
    postMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'link-1',
            downstreamSspId: 'ssp-downstream-1',
            upstreamSspId: 'ssp-upstream-1',
            offeringId: 'offering-1',
            offeringVersion: 2,
            controlId: 'ac-1',
            providedUuid: 'p-1',
            inheritedUuid: 'inherited-1',
            leveragedAuthUuid: 'auth-1',
            satisfaction: 'full',
            status: 'active',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const wrapper = mountView();
    await findButton(wrapper, 'Subscribe').trigger('click');

    const itemCheckbox = wrapper.find('input[type="checkbox"]');
    await itemCheckbox.setValue(true);

    const responsibilityCheckboxes = wrapper.findAll('input[type="checkbox"]');
    await responsibilityCheckboxes[1].setValue(true);

    // No leveraged-authorization inputs anywhere: sharing is decoupled from an ATO.
    expect(wrapper.findAll('input:not([type="checkbox"])')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Party UUID');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // The subscribe body carries no leveragedAuthorization — just the downstream and items.
    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/ssp-export-offerings/offering-1/subscribe',
      {
        downstreamSspId: 'ssp-downstream-1',
        items: [{ itemId: 'item-1', satisfiedResponsibilityUuids: ['r-1'] }],
      },
    );
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('blocks submitting with zero items selected', async () => {
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    await findButton(wrapper, 'Subscribe').trigger('click');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Select at least one item to inherit.');
  });

  it('hides Subscribe without ssp-export-offering:subscribe', () => {
    permState.canSubscribe = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Subscribe',
    );
  });

  it('hides Subscribe without ssp:update on the current SSP', () => {
    permState.canUpdateSsp = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Subscribe',
    );
  });

  it('hides Subscribe when both permissions are denied', () => {
    permState.canSubscribe = false;
    permState.canUpdateSsp = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Subscribe',
    );
  });
});
