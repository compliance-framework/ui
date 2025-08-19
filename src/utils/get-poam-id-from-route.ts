import type { RouteLocationNormalizedLoaded } from 'vue-router';

export function getPoamIdFromRoute(route: RouteLocationNormalizedLoaded) {
  if (route.params.id instanceof Array) {
    return route.params.id[0] ?? '';
  }
  return route.params.id ?? '';
}
