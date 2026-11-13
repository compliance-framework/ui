import { computed, type ComputedRef, type Ref } from 'vue';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { useDataApi } from '@/composables/axios';

/**
 * The states every design-system data view renders through DataState: loading, ready, a
 * successful empty result, an error with retry, and forbidden.
 */
export type QueryStatus = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden';

export interface ApiQuery<T> {
  status: ComputedRef<QueryStatus>;
  data: Ref<T | undefined>;
  retry: () => void;
}

/**
 * Reads an enveloped API endpoint through `useDataApi` and maps the request onto a QueryStatus,
 * so screens pass `status` straight to DataState. A 403 is forbidden; any other failure is an
 * error the user can retry.
 */
export function useApiQuery<T>(
  url: string,
  options: { isEmpty?: (data: T) => boolean; config?: AxiosRequestConfig } = {},
): ApiQuery<T> {
  const { data, error, isLoading, isFinished, execute } = useDataApi<T>(
    url,
    options.config,
  );

  const status = computed<QueryStatus>(() => {
    if (isLoading.value || !isFinished.value) return 'loading';
    if (error.value) {
      return (error.value as AxiosError).response?.status === 403
        ? 'forbidden'
        : 'error';
    }
    if (data.value === undefined) return 'error';
    return options.isEmpty?.(data.value) ? 'empty' : 'ready';
  });

  function retry(): void {
    void execute().catch(() => undefined);
  }

  return { status, data, retry };
}
