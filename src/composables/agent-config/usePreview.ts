// Live, debounced, advisory preview (LLD U2.5): POST …/config/preview 1.5 s after the last
// draft change, only when the draft parses, has no blocking client issues and is at most
// 256 KiB (larger drafts preview on Review only). Each call aborts the previous one.

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
  const error = ref<string | null>(null);
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function liveEligible(): boolean {
    return (
      canPreview.value &&
      byteSize(JSON.stringify(overlay.value)) <= LIMITS.overlayBytes
    );
  }

  /** Runs a preview now for the current overlay; resolves to it (or throws). */
  async function run(): Promise<ConfigPreview> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    controller?.abort();
    const ctrl = new AbortController();
    controller = ctrl;
    const target = clone(overlay.value);
    status.value = 'checking';
    error.value = null;
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
      if (controller === ctrl) controller = null;
    }
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
    if (!liveEligible() || isCurrent()) return;
    timer = setTimeout(() => {
      timer = null;
      run().catch(() => undefined);
    }, LIVE_PREVIEW_DEBOUNCE_MS);
  }

  watch([overlay, canPreview], schedule, { immediate: true });

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
  }

  onScopeDispose(stop);

  return {
    lastPreview,
    lastPreviewFor,
    status,
    error,
    run,
    isCurrent,
    stop,
    retry: () => run().catch(() => undefined),
  };
}

export type PreviewState = ReturnType<typeof usePreview>;
