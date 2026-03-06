import type { AxiosError } from 'axios';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

export function getRouteParam(
  route: RouteLocationNormalizedLoaded,
  key: string,
): string {
  const value = route.params[key];

  if (Array.isArray(value)) {
    return String(value[0] || '');
  }

  return String(value || '');
}

export function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function resolveApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiError = error as AxiosError<ErrorResponse<ErrorBody>>;

  return apiError.response?.data?.errors?.body || apiError.message || fallback;
}

export function toDateInputValue(value?: string): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}
