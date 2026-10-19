import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { sspHasScopeEntries } from '@/composables/useSspScope';
import type { Evidence } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';

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
  // Whether the last fetch used the SSP's scope, i.e. the SSP has scope entries.
  const scoped = ref(false);

  async function fetchBaselineEvidence(): Promise<Evidence[]> {
    const id = toValue(sspId);
    const hasScope = id ? await sspHasScopeEntries(api, id) : false;
    scoped.value = hasScope;
    const response = hasScope
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

  return { fetchBaselineEvidence, scoped };
}
