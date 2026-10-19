import { toValue, type MaybeRefOrGetter } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { sspScopeEndpoint } from '@/composables/useSspScope';
import type { Evidence } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import type { SspScope } from '@/types/ssp-scope';
import { getErrorStatus } from '@/utils/httpErrors';

export const SCOPED_BASELINE_EVIDENCE_LIMIT = 100;

// The evidence that filter-building forms offer as a starting point (the "baseline
// evidence" picker and its label pickers). Inside an SSP that has a scope it is the SSP's
// in-scope evidence; without an SSP, or for an SSP with no scope entries, it is all
// evidence, as before. An empty scope is "not declared yet", not "nothing", so it must
// not hide every piece of evidence from the form.
export function useBaselineEvidence(
  sspId?: MaybeRefOrGetter<string | null | undefined>,
) {
  const api = useAuthenticatedInstance();

  async function scopeHasEntries(id: string): Promise<boolean> {
    try {
      const response = await api.get<DataResponse<SspScope>>(
        sspScopeEndpoint(id),
      );
      return (response.data.data?.entries?.length ?? 0) > 0;
    } catch (error) {
      // An API without SSP scopes: keep today's unscoped behaviour.
      if (getErrorStatus(error) === 404) return false;
      throw error;
    }
  }

  async function fetchBaselineEvidence(): Promise<Evidence[]> {
    const id = toValue(sspId);
    const scoped = id ? await scopeHasEntries(id) : false;
    const response = scoped
      ? await api.post<DataResponse<Evidence[]>>(
          `/api/oscal/system-security-plans/${id}/evidence/search`,
          { filter: {} },
          { params: { limit: SCOPED_BASELINE_EVIDENCE_LIMIT } },
        )
      : await api.post<DataResponse<Evidence[]>>('/api/evidence/search', {
          filter: {},
        });
    return response.data.data ?? [];
  }

  return { fetchBaselineEvidence };
}
