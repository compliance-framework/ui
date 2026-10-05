// Live, debounced preview (LLD U2.5, R89): POST …/config/preview 1.5 s after the last draft
// change, only when the draft has no blocking client-only issues and is at most 256 KiB
// (larger drafts preview on Review only). A call for a different draft aborts the one in
// flight; a call for the same draft joins it. It is the UI's validation: its errors gate
// Review & save.

import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import type { ConfigPreview, OverlayDoc } from '@/types/agent-config';
import { clone, deepEqual } from '@/utils/agent-config/merge-patch';
import { byteSize, LIMITS } from '@/utils/agent-config/validation';
import type { AgentConfigApi } from './api-types';

export const LIVE_PREVIEW_DEBOUNCE_MS = 1500;

export type PreviewStatus = 'idle' | 'checking' | 'checked' | 'failed';

export function usePreview(
  agentId: Ref<string>,
  overlay: Ref<OverlayDoc>,
  api: AgentConfigApi,
  canPreview: Ref<boolean>,
) {
  const lastPreview = shallowRef<ConfigPreview | null>(null);
  const lastPreviewFor = shallowRef<OverlayDoc | null>(null);
  const status = ref<PreviewStatus>('idle');
  /** A live preview is scheduled (debouncing) or running. */
  const pending = ref(false);
  const error = ref<string | null>(null);
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** The run in flight and the overlay it was started for. */
  let inflight: {
    for: OverlayDoc;
    promise: Promise<ConfigPreview> | null;
  } | null = null;

  function liveEligible(): boolean {
    return (
      canPreview.value &&
      byteSize(JSON.stringify(overlay.value)) <= LIMITS.overlayBytes
    );
  }

  /** A run is in flight for an overlay deep-equal to the current one. */
  function inflightMatches(): boolean {
    return inflight?.promise != null && deepEqual(inflight.for, overlay.value);
  }

  /**
   * Runs a preview now for the current overlay; resolves to it (or throws). A run already
   * in flight for the same overlay is joined, not aborted (Review must not cancel a live
   * run, nor a live run Review's).
   */
  function run(): Promise<ConfigPreview> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending.value = true;
    if (inflightMatches()) return inflight!.promise!;
    controller?.abort();
    const ctrl = new AbortController();
    controller = ctrl;
    const target = clone(overlay.value);
    const entry: NonNullable<typeof inflight> = { for: target, promise: null };
    inflight = entry;
    status.value = 'checking';
    error.value = null;
    entry.promise = (async () => {
      try {
        const result = await api.preview(agentId.value, target, ctrl.signal);
        if (controller !== ctrl) return result;
        lastPreview.value = result;
        lastPreviewFor.value = target;
        status.value = 'checked';
        return result;
      } catch (e) {
        if (controller === ctrl) {
          status.value = 'failed';
          error.value = e instanceof Error ? e.message : 'Check failed';
        }
        throw e;
      } finally {
        if (inflight === entry) inflight = null;
        if (controller === ctrl) {
          controller = null;
          pending.value = !!timer;
        }
      }
    })();
    return entry.promise;
  }

  function isCurrent(): boolean {
    return (
      lastPreviewFor.value !== null &&
      deepEqual(lastPreviewFor.value, overlay.value)
    );
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    // "Checked" only describes the draft it was computed for.
    if (!isCurrent() && status.value === 'checked') status.value = 'idle';
    pending.value = !!controller;
    if (!liveEligible() || isCurrent() || inflightMatches()) return;
    pending.value = true;
    timer = setTimeout(() => {
      timer = null;
      if (isCurrent() || inflightMatches()) {
        pending.value = !!controller;
        return;
      }
      run().catch(() => undefined);
    }, LIVE_PREVIEW_DEBOUNCE_MS);
  }

  watch([overlay, canPreview], schedule, { immediate: true });

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
    inflight = null;
    pending.value = false;
  }

  onScopeDispose(stop);

  return {
    lastPreview,
    lastPreviewFor,
    status,
    pending,
    error,
    run,
    isCurrent,
    stop,
    retry: () => run().catch(() => undefined),
  };
}

export type PreviewState = ReturnType<typeof usePreview>;
