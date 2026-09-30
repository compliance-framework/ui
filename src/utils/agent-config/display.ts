// Small display helpers for the agent Configuration tab.

import { formatDistanceToNow } from 'date-fns';
import type { ConfigDoc } from '@/types/agent-config';
import { clone, isPlainObject } from './merge-patch';

/**
 * Defence in depth: reports never include the client secret (the agent and the API redact
 * it), but a display copy drops `api.auth.client_secret` if it is ever present.
 */
export function sanitizeForDisplay<T>(doc: T): T {
  if (!isPlainObject(doc)) return doc;
  const out = clone(doc) as ConfigDoc;
  if (isPlainObject(out.api) && isPlainObject(out.api.auth)) {
    delete out.api.auth.client_secret;
  }
  return out as T;
}

export function formatRelative(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatAbsolute(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
}
