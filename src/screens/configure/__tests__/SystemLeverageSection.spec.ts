import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import SystemLeverageSection from '../SystemLeverageSection.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { CatalogOffering } from '@/types/ssp-export-offerings';

const UPSTREAM_SCOPED_SSP_PATH = /system-security-plans\/(?!undefined)/;

const { postMock, toastAddMock, permState, offeringsData } = vi.hoisted(() => ({
  postMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { canSubscribe: true, canUpdateSsp: true },
  offeringsData: { current: [] as CatalogOffering[] },
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { systemId: 'system-1' } }),
}));

vi.mock('@/ds/toasts', () => ({
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
      return {
        data: ref(offeringsData.current),
        error: ref(undefined),
        isLoading: ref(false),
        isFinished: ref(true),
        execute: vi.fn(() => Promise.resolve()),
      };
    },
    useAuthenticatedInstance: () => ({ post: postMock }),
  };
});

// The wizard is classic; its PrimeVue pieces are stubbed. The section's own pieces are real.
const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
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
  // A disabled button also carries its reason, read out after its label.
  const button = wrapper
    .findAll('button')
    .find((b) => b.text().startsWith(text));
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

function mountView() {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SystemLeverageSection, { sspId: 'ssp-downstream-1' }),
        ),
    }),
    { global: { stubs }, attachTo: document.body },
  );
}

/** The wizard renders in the dialog's portal, outside the wrapper. */
const body = () => document.body;

describe('SystemLeverageSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    permState.canSubscribe = true;
    permState.canUpdateSsp = true;
    offeringsData.current = [];
    fetchedUrls.length = 0;
    postMock.mockResolvedValue({ data: { data: [] } });
  });

  it('renders an empty state when there are no published offerings', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain('No published export offerings yet');
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
    await flushPromises();

    const dialog = () => body().querySelector('[role="dialog"]')!;
    const check = async (box: Element) => {
      (box as HTMLInputElement).click();
      await flushPromises();
    };
    await check(dialog().querySelector('input[type="checkbox"]')!);
    await check(dialog().querySelectorAll('input[type="checkbox"]')[1]!);

    // No leveraged-authorization inputs anywhere: sharing is decoupled from an ATO.
    expect(
      dialog().querySelectorAll('input:not([type="checkbox"])'),
    ).toHaveLength(0);
    expect(dialog().textContent).not.toContain('Party UUID');

    dialog()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
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
    await flushPromises();

    body()
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(body().textContent).toContain(
      'Choose at least one item to inherit.',
    );
    wrapper.unmount();
  });

  it('disables Subscribe, saying why, without ssp-export-offering:subscribe', () => {
    permState.canSubscribe = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    const button = findButton(wrapper, 'Subscribe');
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(body().textContent).toContain('subscribing to export offerings');
    wrapper.unmount();
  });

  it('disables Subscribe, saying why, without ssp:update on the current SSP', () => {
    permState.canUpdateSsp = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    const button = findButton(wrapper, 'Subscribe');
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(body().textContent).toContain('changing this security plan');
    wrapper.unmount();
  });

  it('disables Subscribe, saying why, when both permissions are denied', () => {
    permState.canSubscribe = false;
    permState.canUpdateSsp = false;
    offeringsData.current = [makeOffering()];
    const wrapper = mountView();
    const button = findButton(wrapper, 'Subscribe');
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(body().textContent).toContain('subscribing to export offerings');
    wrapper.unmount();
  });
});
