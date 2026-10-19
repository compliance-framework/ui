import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useBaselineEvidence } from '../useBaselineEvidence';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: api.get, post: api.post }),
}));

const evidence = [{ id: 'ev-1', title: 'E', labels: [] }];

function scope(entries: unknown[]) {
  return { data: { data: { autoFilters: false, entries, exceptions: [] } } };
}

describe('useBaselineEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { data: evidence } });
  });

  it('uses all evidence without an SSP', async () => {
    const { fetchBaselineEvidence } = useBaselineEvidence(undefined);

    await expect(fetchBaselineEvidence()).resolves.toEqual(evidence);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/api/evidence/search', {
      filter: {},
    });
  });

  it("uses the SSP's in-scope evidence, 100 at most, when the SSP has a scope", async () => {
    api.get.mockResolvedValue(scope([{ id: 'e-1' }]));
    const { fetchBaselineEvidence, scoped } = useBaselineEvidence(ref('ssp-1'));

    await expect(fetchBaselineEvidence()).resolves.toEqual(evidence);
    expect(scoped.value).toBe(true);
    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope',
    );
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/evidence/search',
      { filter: {} },
      { params: { limit: 100 } },
    );
  });

  it('keeps all evidence for an SSP with an empty scope', async () => {
    api.get.mockResolvedValue(scope([]));
    const { fetchBaselineEvidence, scoped } = useBaselineEvidence(
      () => 'ssp-1',
    );

    await fetchBaselineEvidence();
    expect(scoped.value).toBe(false);

    expect(api.post).toHaveBeenCalledWith('/api/evidence/search', {
      filter: {},
    });
  });

  it('keeps all evidence when the API has no scope route', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    const { fetchBaselineEvidence } = useBaselineEvidence(ref('ssp-1'));

    await fetchBaselineEvidence();

    expect(api.post).toHaveBeenCalledWith('/api/evidence/search', {
      filter: {},
    });
  });

  it('fails instead of widening to all evidence when the scope cannot be read', async () => {
    const failure = { response: { status: 500 } };
    api.get.mockRejectedValue(failure);
    const { fetchBaselineEvidence } = useBaselineEvidence(ref('ssp-1'));

    await expect(fetchBaselineEvidence()).rejects.toBe(failure);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reads the SSP at fetch time, so a getter can resolve late', async () => {
    api.get.mockResolvedValue(scope([{ id: 'e-1' }]));
    const sspId = ref<string | undefined>(undefined);
    const { fetchBaselineEvidence } = useBaselineEvidence(() => sspId.value);

    sspId.value = 'ssp-2';
    await fetchBaselineEvidence();

    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-2/evidence/search',
      { filter: {} },
      { params: { limit: 100 } },
    );
  });
});
