import { computed, inject } from 'vue';
import {
  routeLocationKey,
  type RouteLocationNormalizedLoaded,
} from 'vue-router';

export function useIsV2Route() {
  const route = inject<RouteLocationNormalizedLoaded | null>(
    routeLocationKey,
    null,
  );

  return computed(() =>
    (route?.matched ?? []).some((record) => record.meta.uiVersion === 'v2'),
  );
}
