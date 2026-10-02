import { ref } from 'vue';
import { isAxiosError } from 'axios';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { PaginatedListResponse } from '@/stores/types';
import type { SubjectSummary } from '@/types/subjects';

const SUBJECT_SEARCH_LIMIT = 20;

/**
 * Searches the subjects evidence can name (GET /api/subjects). `unsupported` turns true when
 * the API doesn't have the endpoint, so callers can hide subject controls.
 */
export function useSubjectSearch() {
  const suggestions = ref<SubjectSummary[]>([]);
  const unsupported = ref(false);
  const authenticatedApi = useAuthenticatedInstance();

  // ssp narrows system components to one SSP; other kinds are unaffected.
  async function search(query: string, options: { ssp?: string } = {}) {
    const trimmed = query.trim();
    try {
      const response = await authenticatedApi.get<
        PaginatedListResponse<SubjectSummary>
      >('/api/subjects', {
        params: {
          search: trimmed || undefined,
          ssp: options.ssp || undefined,
          limit: SUBJECT_SEARCH_LIMIT,
        },
      });
      suggestions.value = response.data.data ?? [];
    } catch (error) {
      suggestions.value = [];
      if (isAxiosError(error) && error.response?.status === 404) {
        unsupported.value = true;
      }
    }
  }

  // Looks subjects up by ID. Returns those found; a failed lookup returns none.
  async function lookup(ids: string[]): Promise<SubjectSummary[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      const response = await authenticatedApi.get<
        PaginatedListResponse<SubjectSummary>
      >('/api/subjects', {
        params: { ids: ids.join(','), limit: ids.length },
      });
      return response.data.data ?? [];
    } catch {
      return [];
    }
  }

  return { suggestions, unsupported, search, lookup };
}
