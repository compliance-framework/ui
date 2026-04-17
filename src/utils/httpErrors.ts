import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';

export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof Response) {
    return error.status;
  }

  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.status ?? errorResponse.status;
}

export async function getErrorDetail(
  error: unknown,
  fallbackMessage: string,
): Promise<string> {
  if (error instanceof Response) {
    try {
      const errorData = (await error.clone().json()) as
        | ErrorResponse<ErrorBody>
        | { message?: string; error?: string; detail?: string }
        | null;

      if (!errorData || typeof errorData !== 'object') {
        return error.statusText || fallbackMessage;
      }

      if ('errors' in errorData) {
        return errorData.errors?.body || fallbackMessage;
      }

      return (
        errorData.message ||
        errorData.error ||
        errorData.detail ||
        error.statusText ||
        fallbackMessage
      );
    } catch {
      return error.statusText || fallbackMessage;
    }
  }

  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data?.errors?.body ||
    errorResponse.message ||
    fallbackMessage
  );
}
