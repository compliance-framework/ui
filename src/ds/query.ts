import {
  computed,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
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
 * error the user can retry. A reactive `url` is fetched again whenever it changes, e.g. with the
 * filters in the address.
 */
export function useApiQuery<T>(
  url: MaybeRefOrGetter<string>,
  options: {
    isEmpty?: (data: T) => boolean;
    config?: AxiosRequestConfig;
    /** For endpoints that answer 404 when there is nothing yet: shows the empty state. */
    notFoundIsEmpty?: boolean;
  } = {},
): ApiQuery<T> {
  const { data, error, isLoading, isFinished, execute, response } =
    useDataApi<T>(toValue(url), options.config);
  if (typeof url !== 'string')
    watch(
      () => toValue(url),
      (next) => void execute(next).catch(() => undefined),
    );

  const status = computed<QueryStatus>(() => {
    if (isLoading.value || !isFinished.value) return 'loading';
    if (error.value) {
      const code = (error.value as AxiosError).response?.status;
      if (code === 404 && options.notFoundIsEmpty) return 'empty';
      return code === 403 ? 'forbidden' : 'error';
    }
    if (data.value === undefined) {
      // Go APIs send `{"data": null}` for an empty list: nothing, not a broken response.
      const body = response.value?.data as { data?: unknown } | undefined;
      return body && 'data' in body && body.data === null ? 'empty' : 'error';
    }
    return options.isEmpty?.(data.value) ? 'empty' : 'ready';
  });

  function retry(): void {
    void execute(toValue(url)).catch(() => undefined);
  }

  return { status, data, retry };
}
