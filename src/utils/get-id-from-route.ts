import type { RouteLocationNormalizedLoaded } from 'vue-router';

/**
 * The record id from the route: `:id`, or `:systemId` on the redesigned system routes
 * (/systems/:systemId/...), where the classic SSP section views now render.
 */
export function getIdFromRoute(route: RouteLocationNormalizedLoaded) {
  const id = route.params.id ?? route.params.systemId;
  if (id instanceof Array) {
    return id[0] ?? '';
  }
  return id ?? '';
}
