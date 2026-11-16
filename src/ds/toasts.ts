import { reactive } from 'vue';

/**
 * Toasts (F-13): success and info dismiss themselves after 5 s; warnings and errors stay until
 * dismissed, so nobody misses them; a repeated message replaces the earlier one instead of
 * stacking. ToastRegion renders them.
 */
export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

const SELF_DISMISS_MS = 5000;

export const toasts = reactive<Toast[]>([]);
let nextId = 1;

export function dismissToast(id: number): void {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export function showToast(toast: Omit<Toast, 'id'>): void {
  const duplicate = toasts.find(
    (existing) =>
      existing.title === toast.title && existing.message === toast.message,
  );
  if (duplicate) dismissToast(duplicate.id);
  const id = nextId++;
  toasts.push({ ...toast, id });
  if (toast.tone === 'success' || toast.tone === 'info')
    window.setTimeout(() => dismissToast(id), SELF_DISMISS_MS);
}

/** PrimeVue severities, as used across the app, in design-system tones. */
export function toneOf(severity: unknown): ToastTone {
  if (severity === 'success') return 'success';
  if (severity === 'warn' || severity === 'warning') return 'warning';
  if (severity === 'error' || severity === 'danger') return 'error';
  return 'info';
}

/** A toast as the app raises it: PrimeVue-style names, kept so call sites read the same. */
export interface ToastMessage {
  severity?: string;
  summary?: unknown;
  detail?: unknown;
  /** Accepted for compatibility; how long a toast stays is set by its tone. */
  life?: number;
}

/** `useToast().add({ severity, summary, detail })` raises a toast; ToastRegion shows it. */
export function useToast() {
  return {
    add(message: ToastMessage): void {
      const title = message.summary ? String(message.summary) : '';
      const detail = message.detail ? String(message.detail) : undefined;
      showToast({
        tone: toneOf(message.severity),
        title: title || detail || 'Done',
        message: title ? detail : undefined,
      });
    },
    removeAllGroups(): void {
      toasts.splice(0, toasts.length);
    },
  };
}
