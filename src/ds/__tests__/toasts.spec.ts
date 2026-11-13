import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToastEventBus from 'primevue/toasteventbus';
import {
  bridgePrimeVueToasts,
  dismissToast,
  showToast,
  toasts,
  toneOf,
} from '../toasts';

describe('toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toasts.splice(0, toasts.length);
  });
  afterEach(() => vi.useRealTimers());

  it('dismisses success after five seconds but keeps errors until dismissed', () => {
    showToast({ tone: 'success', title: 'Saved' });
    showToast({ tone: 'error', title: 'Not saved' });
    vi.advanceTimersByTime(5000);
    expect(toasts.map((t) => t.title)).toEqual(['Not saved']);
    dismissToast(toasts[0]!.id);
    expect(toasts).toHaveLength(0);
  });

  it('replaces a repeated message instead of stacking it', () => {
    showToast({ tone: 'error', title: 'Offline', message: 'Retry' });
    showToast({ tone: 'error', title: 'Offline', message: 'Retry' });
    expect(toasts).toHaveLength(1);
  });

  it('maps the app’s PrimeVue severities to tones', () => {
    expect(['success', 'warn', 'danger', 'secondary'].map(toneOf)).toEqual([
      'success',
      'warning',
      'error',
      'info',
    ]);
  });

  it('shows toasts raised through PrimeVue’s toast service', () => {
    const stop = bridgePrimeVueToasts();
    ToastEventBus.emit('add', {
      severity: 'error',
      summary: 'Delete failed',
      detail: 'Try again.',
      life: 3000,
    });
    expect(toasts).toEqual([
      expect.objectContaining({
        tone: 'error',
        title: 'Delete failed',
        message: 'Try again.',
      }),
    ]);
    ToastEventBus.emit('remove-all-groups');
    expect(toasts).toHaveLength(0);
    stop();
    ToastEventBus.emit('add', { severity: 'info', summary: 'Ignored' });
    expect(toasts).toHaveLength(0);
  });
});
