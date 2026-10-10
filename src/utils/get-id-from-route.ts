import type { RouteLocationNormalizedLoaded } from 'vue-router';

export function getIdFromRoute(route: RouteLocationNormalizedLoaded) {
  if (route.params.id instanceof Array) {
    return route.params.id[0] ?? '';
  }
  return route.params.id ?? '';
}
