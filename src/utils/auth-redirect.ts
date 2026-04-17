import type { RouteLocationRaw } from 'vue-router';

export function resolveAuthNextLocation(nextParam: unknown): RouteLocationRaw {
  if (typeof nextParam !== 'string' || nextParam.trim().length === 0) {
    return { name: 'home' };
  }

  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) {
    return { name: 'home' };
  }

  try {
    const resolved = new URL(nextParam, window.location.origin);
    if (resolved.origin === window.location.origin) {
      return {
        path: `${resolved.pathname}${resolved.search}${resolved.hash}`,
      };
    }
  } catch {
    return { name: 'home' };
  }

  return { name: 'home' };
}
