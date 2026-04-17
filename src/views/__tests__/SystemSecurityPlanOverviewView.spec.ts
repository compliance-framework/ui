import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, shallowRef } from 'vue';
import type {
  Profile,
  SystemCharacteristics,
  SystemSecurityPlan,
} from '@/oscal';

const systemSecurityPlan = shallowRef<SystemSecurityPlan>({
  uuid: 'ssp-1',
  metadata: {
    title: 'SSP One',
    lastModified: '2026-01-01T00:00:00Z',
    version: '1.0.0',
  },
} as SystemSecurityPlan);
const systemCharacteristics = shallowRef<SystemCharacteristics>({
  systemName: 'System One',
} as SystemCharacteristics);
const profiles = shallowRef<Profile[]>([
  {
    uuid: 'profile-a',
    metadata: {
      title: 'Profile A',
      version: '1.0.0',
      lastModified: '2026-01-01T00:00:00Z',
      oscalVersion: '1.1.3',
    },
    imports: [],
  },
  {
    uuid: 'profile-b',
    metadata: {
      title: 'Profile B',
      version: '1.0.0',
      lastModified: '2026-01-01T00:00:00Z',
      oscalVersion: '1.1.3',
    },
    imports: [],
  },
]);
const profilesLoading = ref(false);

const mockListProfiles = vi.fn();
const mockAddProfile = vi.fn();
const mockRemoveProfile = vi.fn();
const mockExecuteSIUsers = vi.fn();
const mockExecuteSIComponents = vi.fn();
const mockExecuteSIInventory = vi.fn();
const mockExecuteSILeveragedAuths = vi.fn();
const mockExecuteDownloadJSON = vi.fn();
const toastAdd = vi.fn();
const routerPush = vi.fn();

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    listProfiles: mockListProfiles,
    addProfile: mockAddProfile,
    removeProfile: mockRemoveProfile,
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string | null) => {
    if (url === '/api/oscal/system-security-plans/ssp-1') {
      return { data: systemSecurityPlan };
    }

    if (
      url === '/api/oscal/system-security-plans/ssp-1/system-characteristics'
    ) {
      return { data: systemCharacteristics };
    }

    if (url === '/api/oscal/profiles') {
      return { data: profiles, isLoading: profilesLoading };
    }

    if (url?.endsWith('/system-implementation/users')) {
      return {
        execute: mockExecuteSIUsers,
      };
    }

    if (url?.endsWith('/system-implementation/components')) {
      return {
        execute: mockExecuteSIComponents,
      };
    }

    if (url?.endsWith('/system-implementation/inventory-items')) {
      return {
        execute: mockExecuteSIInventory,
      };
    }

    if (url?.endsWith('/system-implementation/leveraged-authorizations')) {
      return {
        execute: mockExecuteSILeveragedAuths,
      };
    }

    if (url === '/api/oscal/system-security-plans/ssp-1/full') {
      return {
        execute: mockExecuteDownloadJSON,
      };
    }

    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'ssp-1' },
  }),
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock('@/components/system-security-plans/RiskOverviewSection.vue', () => ({
  default: {
    name: 'RiskOverviewSection',
    template: '<div data-testid="risk-overview-section" />',
  },
}));

vi.mock('@/volt/MultiSelect.vue', () => ({
  default: {
    name: 'MultiSelect',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div data-testid="profiles-multiselect" />',
  },
}));

import SystemSecurityPlanOverviewView from '../system-security-plans/SystemSecurityPlanOverviewView.vue';

type OverviewViewModel = {
  selectedProfiles: string[];
};

describe('SystemSecurityPlanOverviewView profile bindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListProfiles.mockResolvedValue({
      data: [{ uuid: 'profile-a', title: 'Profile A' }],
    });
    mockAddProfile.mockResolvedValue(undefined);
    mockRemoveProfile.mockResolvedValue(undefined);
    mockExecuteSIUsers.mockResolvedValue({ data: ref({ data: [] }) });
    mockExecuteSIComponents.mockResolvedValue({ data: ref({ data: [] }) });
    mockExecuteSIInventory.mockResolvedValue({ data: ref({ data: [] }) });
    mockExecuteSILeveragedAuths.mockResolvedValue({ data: ref({ data: [] }) });
    mockExecuteDownloadJSON.mockResolvedValue({ data: ref({}) });
  });

  async function mountView() {
    const wrapper = mount(SystemSecurityPlanOverviewView);
    await flushPromises();
    return wrapper;
  }

  it('loads existing profile bindings into the MultiSelect model', async () => {
    const wrapper = await mountView();

    expect(mockListProfiles).toHaveBeenCalledWith('ssp-1');
    expect(
      (wrapper.vm as unknown as OverviewViewModel).selectedProfiles,
    ).toEqual(['profile-a']);
  });

  it('adds selected profiles and removes deselected profiles', async () => {
    mockListProfiles.mockResolvedValueOnce({
      data: [
        { uuid: 'profile-a', title: 'Profile A' },
        { uuid: 'profile-b', title: 'Profile B' },
      ],
    });
    const wrapper = await mountView();
    const multiSelect = wrapper.findComponent({ name: 'MultiSelect' });

    await multiSelect.vm.$emit('update:modelValue', ['profile-a']);
    await flushPromises();

    expect(mockRemoveProfile).toHaveBeenCalledWith('ssp-1', 'profile-b');

    await multiSelect.vm.$emit('update:modelValue', ['profile-a', 'profile-b']);
    await flushPromises();

    expect(mockAddProfile).toHaveBeenCalledWith('ssp-1', 'profile-b');
  });

  it('reverts the selection to persisted bindings when a profile update fails', async () => {
    mockListProfiles
      .mockResolvedValueOnce({
        data: [{ uuid: 'profile-a', title: 'Profile A' }],
      })
      .mockResolvedValueOnce({
        data: [{ uuid: 'profile-a', title: 'Profile A' }],
      });
    mockAddProfile.mockRejectedValueOnce(
      new Response(JSON.stringify({ errors: { body: 'Binding failed' } }), {
        status: 500,
      }),
    );
    const wrapper = await mountView();
    const multiSelect = wrapper.findComponent({ name: 'MultiSelect' });

    await multiSelect.vm.$emit('update:modelValue', ['profile-a', 'profile-b']);
    await flushPromises();

    expect(mockAddProfile).toHaveBeenCalledWith('ssp-1', 'profile-b');
    expect(mockListProfiles).toHaveBeenCalledTimes(2);
    expect(
      (wrapper.vm as unknown as OverviewViewModel).selectedProfiles,
    ).toEqual(['profile-a']);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Failed to update profiles',
        detail: 'Binding failed',
      }),
    );
  });
});
