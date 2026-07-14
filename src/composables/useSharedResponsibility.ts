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

  const {
    data: rollup,
    isLoading: rollupLoading,
    error: rollupError,
    execute: fetchRollup,
  } = useDataApi<SharedResponsibilityRollup>(null, {}, { immediate: false });

  const {
    data: offers,
    isLoading: offersLoading,
    error: offersError,
    execute: fetchOffers,
  } = useDataApi<ControlExportOffer[]>(null, {}, { immediate: false });

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
