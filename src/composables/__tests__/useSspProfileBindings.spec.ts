import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { useSspProfileBindings } from '../useSspProfileBindings';

const store = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  addProfile: vi.fn(),
  removeProfile: vi.fn(),
}));
const toastAdd = vi.hoisted(() => vi.fn());
vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => store,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: toastAdd }) }));

describe('useSspProfileBindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.listProfiles.mockResolvedValue({ data: [{ uuid: 'profile-a' }] });
    store.addProfile.mockResolvedValue({});
    store.removeProfile.mockResolvedValue({});
  });

  it('loads the system’s existing profile bindings without saving them', async () => {
    const { selectedProfiles, loadInitialProfiles } = useSspProfileBindings(
      () => 'ssp-1',
    );
    await loadInitialProfiles();
    await flushPromises();
    expect(store.listProfiles).toHaveBeenCalledWith('ssp-1');
    expect(selectedProfiles.value).toEqual(['profile-a']);
    expect(store.addProfile).not.toHaveBeenCalled();
  });

  it('adds ticked profiles and removes unticked ones', async () => {
    store.listProfiles.mockResolvedValue({
      data: [{ uuid: 'profile-a' }, { uuid: 'profile-b' }],
    });
    const { selectedProfiles, loadInitialProfiles } = useSspProfileBindings(
      () => 'ssp-1',
    );
    await loadInitialProfiles();
    selectedProfiles.value = ['profile-a'];
    await flushPromises();
    expect(store.removeProfile).toHaveBeenCalledWith('ssp-1', 'profile-b');
    selectedProfiles.value = ['profile-a', 'profile-b'];
    await flushPromises();
    expect(store.addProfile).toHaveBeenCalledWith('ssp-1', 'profile-b');
  });

  it('reverts to the saved bindings and says why when an update fails', async () => {
    store.addProfile.mockRejectedValueOnce(
      new Response(JSON.stringify({ errors: { body: 'Binding failed' } }), {
        status: 500,
      }),
    );
    const { selectedProfiles, loadInitialProfiles } = useSspProfileBindings(
      () => 'ssp-1',
    );
    await loadInitialProfiles();
    selectedProfiles.value = ['profile-a', 'profile-b'];
    await flushPromises();
    expect(store.listProfiles).toHaveBeenCalledTimes(2);
    expect(selectedProfiles.value).toEqual(['profile-a']);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Failed to update profiles',
        detail: 'Binding failed',
      }),
    );
  });
});
