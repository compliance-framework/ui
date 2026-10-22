import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEvidenceDashboardForm } from '../useEvidenceDashboardForm';

const state = vi.hoisted(() => ({
  fetchBaselineEvidence: vi.fn(),
  sspIds: [] as unknown[],
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/useBaselineEvidence', async () => {
  const { ref } = await import('vue');
  return {
    useBaselineEvidence: (sspId: unknown) => {
      state.sspIds.push(sspId);
      return {
        fetchBaselineEvidence: state.fetchBaselineEvidence,
        scoped: ref(true),
      };
    },
  };
});

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

describe('useEvidenceDashboardForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sspIds.length = 0;
  });

  it('builds its baseline from the SSP it is given, keeping labelled evidence', async () => {
    const getSspId = () => 'ssp-1';
    state.fetchBaselineEvidence.mockResolvedValue([
      { id: 'a', title: 'Repo check', labels: [{ name: 'repo', value: 'a' }] },
      { id: 'b', title: 'No labels', labels: [] },
    ]);

    const form = useEvidenceDashboardForm(getSspId);
    await form.loadAvailableEvidence();

    expect(state.sspIds).toEqual([getSspId]);
    expect(form.availableEvidence.value.map((ev) => ev.id)).toEqual(['a']);
    expect(form.availableEvidence.value[0].searchText).toBe(
      'Repo check repo a',
    );
  });

  it('shows a toast when the baseline cannot be loaded', async () => {
    state.fetchBaselineEvidence.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const form = useEvidenceDashboardForm('ssp-1');
    await form.loadAvailableEvidence();

    expect(form.availableEvidence.value).toEqual([]);
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Failed to load evidence' }),
    );
  });

  it('follows the scope of a scoped SSP by default, again after a reset', () => {
    const form = useEvidenceDashboardForm('ssp-1');
    expect(form.scopeFollowable.value).toBe(true);
    expect(form.followSspScope.value).toBe(true);

    form.followSspScope.value = false;
    form.reset();

    expect(form.followSspScope.value).toBe(true);
  });
});
