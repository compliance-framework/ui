import { computed, watch, type Ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { ControlExportOffer } from '@/types/ssp-export-offerings';
import type { SharedResponsibilityRollup } from '@/types/ssp-leverage';

// Both endpoints below are hand-written camelCase JSON (like export-offerings and leverage),
// so requests must NOT use decamelizeKeys — only the OSCAL by-component routes do.
//
// The URLs are computed, not interpolated once at setup: `useDataApi` resolves `toValue(url)`
// a single time, and these panels live under a <KeepAlive> tab host, so a plain string would
// pin the first sspId/controlId forever (the stale-fetch bug this work also fixes elsewhere).

export function buildSharedResponsibilityUrl(
  sspId: string,
  controlId?: string,
): string {
  const base = `/api/oscal/system-security-plans/${sspId}/shared-responsibility`;
  return controlId
    ? `${base}?controlId=${encodeURIComponent(controlId)}`
    : base;
}

export function buildControlOffersUrl(
  controlId: string,
  downstreamSspId: string,
): string {
  return `/api/oscal/ssp-export-offerings/by-control/${encodeURIComponent(
    controlId,
  )}?downstreamSspId=${encodeURIComponent(downstreamSspId)}`;
}

export function useSharedResponsibility(
  sspId: Ref<string | undefined>,
  controlId: Ref<string | undefined>,
) {
  const rollupUrl = computed(() =>
    sspId.value
      ? buildSharedResponsibilityUrl(sspId.value, controlId.value)
      : null,
  );

  const offersUrl = computed(() =>
    sspId.value && controlId.value
      ? buildControlOffersUrl(controlId.value, sspId.value)
      : null,
  );

  // abortPrevious: false — these are two independent GETs, not a typeahead. Under vueuse's
  // default (`true`) an overlapping execute() aborts the in-flight one, and useAxios guards
  // its SUCCESS path on isAborted but NOT its error path: the aborted request's
  // CanceledError lands in `error` after the newer execute() already cleared it, so a fetch
  // that actually succeeded renders as a failure. Two refresh()es in quick succession — a
  // Retry pressed during the initial load, two deletes in a row — are enough to trip it.
  const {
    data: rollup,
    isLoading: rollupLoading,
    error: rollupError,
    execute: fetchRollup,
  } = useDataApi<SharedResponsibilityRollup>(
    null,
    {},
    { immediate: false, abortPrevious: false },
  );

  const {
    data: offers,
    isLoading: offersLoading,
    error: offersError,
    execute: fetchOffers,
  } = useDataApi<ControlExportOffer[]>(
    null,
    {},
    { immediate: false, abortPrevious: false },
  );

  // The `.catch`es below only stop a rejected fetch becoming an unhandled rejection — they are
  // NOT the error handling. `rollupError` / `offersError` are the signal, and callers MUST
  // render a failure state from them: `data` is left untouched on the error path, so a failed
  // fetch is otherwise indistinguishable from an empty result, and "this system exports
  // nothing for this control" is a dangerous thing to say when the request simply broke.
  async function refresh(): Promise<void> {
    await Promise.all([
      rollupUrl.value
        ? fetchRollup(rollupUrl.value).catch(() => undefined)
        : Promise.resolve(),
      offersUrl.value
        ? fetchOffers(offersUrl.value).catch(() => undefined)
        : Promise.resolve(),
    ]);
  }

  watch(
    [rollupUrl, offersUrl],
    () => {
      if (!rollupUrl.value) {
        rollup.value = undefined;
      }
      if (!offersUrl.value) {
        offers.value = undefined;
      }
      void refresh();
    },
    { immediate: true },
  );

  return {
    rollup,
    rollupLoading,
    rollupError,
    offers,
    offersLoading,
    offersError,
    refresh,
  };
}
