import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

/**
 * Formatted error information for display in toast notifications
 */
export interface FormattedError {
  /**
   * User-friendly error summary/title
   */
  summary: string;

  /**
   * Detailed error message
   */
  detail: string;

  /**
   * HTTP status code (if available)
   */
  statusCode?: number;
}

/**
 * Format an AxiosError into user-friendly toast message components
 *
 * Extracts HTTP status codes, API error messages, and provides fallback messages
 * for better user experience.
 *
 * @example
 * ```typescript
 * try {
 *   await api.post('/users', userData);
 * } catch (err) {
 *   const formatted = formatAxiosError(err as AxiosError<ErrorResponse<ErrorBody>>);
 *   toast.add({
 *     severity: 'error',
 *     summary: formatted.summary,
 *     detail: formatted.detail,
 *     life: 5000,
 *   });
 * }
 * ```
 *
 * @param error - The AxiosError to format
 * @returns Formatted error object with summary, detail, and status code
 */
export function formatAxiosError(
  error: AxiosError<ErrorResponse<ErrorBody>>,
): FormattedError {
  const statusCode = error.response?.status;
  const apiErrorMessage = error.response?.data?.errors?.body;

  return {
    summary: getErrorSummary(statusCode),
    detail: apiErrorMessage || getErrorDetail(error),
    statusCode,
  };
}

/**
 * Get user-friendly error summary based on HTTP status code
 *
 * Maps common HTTP status codes to human-readable titles.
 *
 * @param statusCode - HTTP status code from the error response
 * @returns User-friendly error title
 *
 * @internal
 */
function getErrorSummary(statusCode?: number): string {
  const statusMessages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  if (!statusCode) {
    return 'Error';
  }

  return statusMessages[statusCode] || `Error ${statusCode}`;
}

/**
 * Get detailed error message with fallbacks
 *
 * Attempts to extract error message from various parts of the AxiosError
 * in order of preference:
 * 1. API error body (response.data.errors.body)
 * 2. Error message property
 * 3. Generic fallback message
 *
 * @param error - The AxiosError to extract details from
 * @returns Detailed error message
 *
 * @internal
 */
function getErrorDetail(error: AxiosError<ErrorResponse<ErrorBody>>): string {
  // Try API error body (already checked in formatAxiosError, but kept for completeness)
  if (error.response?.data?.errors?.body) {
    return error.response.data.errors.body;
  }

  // Try error message
  if (error.message) {
    return error.message;
  }

  // Network error without response
  if (!error.response) {
    return 'Unable to connect to the server. Please check your network connection and try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}
