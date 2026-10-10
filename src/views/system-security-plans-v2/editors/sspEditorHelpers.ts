import type { AxiosError } from 'axios';
import { toRaw } from 'vue';
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
  return structuredClone(toRaw(value));
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

// Property and link rows in V2 editors: rows left completely empty are dropped
// before saving; partly filled rows must satisfy OSCAL (a property needs a name
// and a value, a link needs an href) or the save is blocked.
type EditableProperty = { name?: string; value?: string };
type EditableLink = { href?: string; text?: string; rel?: string };

const isBlank = (value?: string) => !value?.trim();

export function isBlankProperty(property: EditableProperty): boolean {
  return isBlank(property.name) && isBlank(property.value);
}

export function isBlankLink(link: EditableLink): boolean {
  return isBlank(link.href) && isBlank(link.text) && isBlank(link.rel);
}

export function propertyAndLinkErrors(
  properties: EditableProperty[],
  links: EditableLink[],
): string[] {
  const errors: string[] = [];
  properties.forEach((property, index) => {
    if (
      !isBlankProperty(property) &&
      (isBlank(property.name) || isBlank(property.value))
    ) {
      errors.push(`Property ${index + 1} needs both a name and a value.`);
    }
  });
  links.forEach((link, index) => {
    if (!isBlankLink(link) && isBlank(link.href)) {
      errors.push(`Link ${index + 1} needs an HREF.`);
    }
  });
  return errors;
}
