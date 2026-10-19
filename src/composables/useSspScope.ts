import { ref, type Ref } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import type {
  ScopeEntry,
  ScopeException,
  ScopeLabel,
  SspScope,
} from '@/types/ssp-scope';

export function sspScopeEndpoint(sspId: string): string {
  return `/api/oscal/system-security-plans/${sspId}/scope`;
}

// Reads and edits one SSP's scope. The routes are kebab-case, so request bodies go out
// through decamelizeKeys (`autoFilters` -> `auto-filters`). There is no way to delete an
// entry: an entry leaves the scope only when an exception with the same labels is added.
//
// Every write re-reads the scope afterwards, because one write can change both lists
// (an exception removes its entry; an entry removes its exception). Errors are thrown to
// the caller, which shows the API's message (e.g. the 409 refusing to empty a scope that
// filters follow).
export function useSspScope(sspId: Ref<string | undefined>) {
  const api = useAuthenticatedInstance();
  const scope = ref<SspScope | undefined>();
  const loading = ref(false);

  function requireSspId(): string {
    if (!sspId.value) {
      throw new Error('No system security plan selected');
    }
    return sspId.value;
  }

  async function load(): Promise<SspScope | undefined> {
    if (!sspId.value) {
      scope.value = undefined;
      return undefined;
    }
    loading.value = true;
    try {
      const response = await api.get<DataResponse<SspScope>>(
        sspScopeEndpoint(sspId.value),
      );
      scope.value = response.data.data;
      return scope.value;
    } finally {
      loading.value = false;
    }
  }

  async function addEntry(labels: ScopeLabel[]): Promise<ScopeEntry> {
    const response = await api.post<DataResponse<ScopeEntry>>(
      `${sspScopeEndpoint(requireSspId())}/entries`,
      { labels },
      { transformRequest: [decamelizeKeys] },
    );
    await load();
    return response.data.data;
  }

  async function addException(labels: ScopeLabel[]): Promise<ScopeException> {
    const response = await api.post<DataResponse<ScopeException>>(
      `${sspScopeEndpoint(requireSspId())}/exceptions`,
      { labels },
      { transformRequest: [decamelizeKeys] },
    );
    await load();
    return response.data.data;
  }

  async function deleteException(exceptionId: string): Promise<void> {
    await api.delete(
      `${sspScopeEndpoint(requireSspId())}/exceptions/${exceptionId}`,
    );
    await load();
  }

  async function setAutoFilters(enabled: boolean): Promise<void> {
    await api.put(
      sspScopeEndpoint(requireSspId()),
      { autoFilters: enabled },
      { transformRequest: [decamelizeKeys] },
    );
    await load();
  }

  return {
    scope,
    loading,
    load,
    addEntry,
    addException,
    deleteException,
    setAutoFilters,
  };
}
