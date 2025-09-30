import { watch, type Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { formatAxiosError } from '@/utils/error-formatting';

/**
 * Configuration options for the useErrorToast composable
 */
export interface ErrorToastOptions {
  /**
   * Summary prefix to show before the error status.
   * If not provided, only the status code message will be shown.
   *
   * @example "Error loading user" becomes "Error loading user: 404 Not Found"
   */
  summary?: string;

  /**
   * Toast lifetime in milliseconds
   * @default 5000
   */
  life?: number;

  /**
   * Whether to automatically show the toast when error occurs
   * Set to false if you need custom handling before showing the toast
   * @default true
   */
  autoShow?: boolean;

  /**
   * Custom error message extractor function.
   * Use this to provide custom logic for extracting error messages
   * based on your specific error scenarios.
   *
   * @param error - The AxiosError object
   * @returns Custom error detail message
   */
  extractMessage?: (error: AxiosError<ErrorResponse<ErrorBody>>) => string;
}

/**
 * Composable to automatically display toast notifications for Axios errors
 *
 * This composable watches a reactive error ref (typically from useDataApi or useGuestApi)
 * and automatically displays a toast notification when an error occurs. It extracts
 * HTTP status codes and API error messages to provide informative feedback to users.
 *
 * @example
 * Basic usage with automatic toast:
 * ```typescript
 * const { data, error, isLoading } = useDataApi<User[]>('/api/users');
 * useErrorToast(error, { summary: 'Error loading users' });
 * ```
 *
 * @example
 * Manual control with custom handling:
 * ```typescript
 * const { data, error } = useDataApi<User>(`/api/users/${id}`);
 * const { showErrorToast } = useErrorToast(error, {
 *   summary: 'Error loading user',
 *   autoShow: false
 * });
 *
 * watch(error, (err) => {
 *   if (err) {
 *     showErrorToast(err);
 *     // Additional custom handling
 *     router.push({ name: 'users-list' });
 *   }
 * });
 * ```
 *
 * @example
 * Custom error message extraction:
 * ```typescript
 * const { data, error } = useDataApi<AssessmentResult>('/api/assessment-results');
 * useErrorToast(error, {
 *   summary: 'Assessment Results Error',
 *   extractMessage: (err) => {
 *     if (err.response?.status === 404) {
 *       return 'Assessment result not found. It may have been deleted.';
 *     }
 *     return err.response?.data?.errors?.body || 'Failed to load assessment results';
 *   }
 * });
 * ```
 *
 * @param errorRef - Reactive reference to an AxiosError (typically from useDataApi)
 * @param options - Configuration options for the error toast
 * @returns Object with showErrorToast function for manual error toast display
 */
export function useErrorToast(
  errorRef: Ref<AxiosError<ErrorResponse<ErrorBody>> | null | undefined>,
  options: ErrorToastOptions = {},
) {
  const toast = useToast();

  const { summary, life = 5000, autoShow = true, extractMessage } = options;

  // Automatically watch the error ref and show toast when error occurs
  watch(errorRef, (error) => {
    if (error && autoShow) {
      showErrorToast(error);
    }
  });

  /**
   * Manually show an error toast for the given error
   *
   * Use this when autoShow is false or when you need to show
   * an error toast outside of the automatic watcher.
   *
   * @param error - The AxiosError to display
   */
  function showErrorToast(error: AxiosError<ErrorResponse<ErrorBody>>) {
    const formatted = formatAxiosError(error);

    // Use custom message extractor if provided
    const detail = extractMessage ? extractMessage(error) : formatted.detail;

    // Build summary with optional prefix
    const toastSummary = summary
      ? `${summary}: ${formatted.summary}`
      : formatted.summary;

    toast.add({
      severity: 'error',
      summary: toastSummary,
      detail,
      life,
    });
  }

  return {
    showErrorToast,
  };
}
