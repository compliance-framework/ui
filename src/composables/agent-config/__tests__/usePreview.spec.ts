import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, shallowRef } from 'vue';
import type { OverlayDoc } from '@/types/agent-config';
import type { AgentConfigApi } from '../api-types';
import { LIVE_PREVIEW_DEBOUNCE_MS, usePreview } from '../usePreview';

const result = {
  desiredRevision: 7,
  standalone: true,
  overlayErrors: [],
  policyErrors: [],
  instances: [],
};

function setup(canPreview = true) {
  const preview = vi.fn().mockResolvedValue(result);
  const api = { preview } as unknown as AgentConfigApi;
  const overlay = shallowRef<OverlayDoc>({ verbosity: 1 });
  const can = ref(canPreview);
  const scope = effectScope();
  const state = scope.run(() => usePreview(ref('a1'), overlay, api, can))!;
  return { preview, overlay, can, state, scope };
}

describe('usePreview (live checks)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs 1.5 s after the last change, aborting the previous call', async () => {
    const { preview, overlay, state, scope } = setup();
    vi.advanceTimersByTime(LIVE_PREVIEW_DEBOUNCE_MS - 1);
    expect(preview).not.toHaveBeenCalled();
    overlay.value = { verbosity: 2 };
    await nextTick();
    vi.advanceTimersByTime(LIVE_PREVIEW_DEBOUNCE_MS);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0][1]).toEqual({ verbosity: 2 });
    const signal = preview.mock.calls[0][2] as AbortSignal;
    await vi.runAllTimersAsync();
    expect(state.status.value).toBe('checked');
    expect(state.isCurrent()).toBe(true);
    // A manual run aborts nothing now, but a new run supersedes an in-flight one.
    preview.mockImplementation(() => new Promise(() => undefined));
    overlay.value = { verbosity: 0 };
    await nextTick();
    vi.advanceTimersByTime(LIVE_PREVIEW_DEBOUNCE_MS);
    const inflight = preview.mock.calls[1][2] as AbortSignal;
    state.run().catch(() => undefined);
    expect(inflight.aborted).toBe(true);
    expect(signal.aborted).toBe(false);
    scope.stop();
  });

  it('does not run when previews are not allowed or the draft is over 256 KiB', async () => {
    const { preview, overlay, can, scope } = setup(false);
    vi.advanceTimersByTime(LIVE_PREVIEW_DEBOUNCE_MS * 2);
    expect(preview).not.toHaveBeenCalled();
    can.value = true;
    overlay.value = {
      plugins: { a: { config: { blob: 'x'.repeat(300 * 1024) } } },
    };
    await nextTick();
    vi.advanceTimersByTime(LIVE_PREVIEW_DEBOUNCE_MS * 2);
    expect(preview).not.toHaveBeenCalled();
    scope.stop();
  });
});
