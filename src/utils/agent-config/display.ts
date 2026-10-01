// Small display helpers for the agent Configuration tab.

import type { ConfigDoc, PolicyError } from '@/types/agent-config';
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

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 hours ago" / "in 3 days" (Intl, no date library in the page chunk). */
export function formatRelative(
  value?: string | null,
  now: number = Date.now(),
): string {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const seconds = Math.round((t - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size)
      return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'minute');
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

/**
 * Where a policy problem is: `<bundle>/<path>[:row:col]`, or just `<bundle>` for a
 * bundle-level one (empty path, e.g. the agent's policy-stream-forked).
 */
export function policyErrorLocation(e: PolicyError): string {
  if (!e.path) return e.bundle;
  const pos = e.row ? `:${e.row}:${e.col ?? 1}` : '';
  return `${e.bundle}/${e.path}${pos}`;
}
