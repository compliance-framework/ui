import { describe, expect, it } from 'vitest';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { getIdFromRoute } from './get-id-from-route';

const route = (params: Record<string, string | string[]>) =>
  ({ params }) as unknown as RouteLocationNormalizedLoaded;

describe('getIdFromRoute', () => {
  it('reads :id', () => {
    expect(getIdFromRoute(route({ id: 'ssp-1' }))).toBe('ssp-1');
  });

  it('falls back to :systemId on the system routes', () => {
    expect(getIdFromRoute(route({ systemId: 'ssp-2' }))).toBe('ssp-2');
  });

  it('takes the first of a repeated param, and is empty without one', () => {
    expect(getIdFromRoute(route({ id: ['a', 'b'] }))).toBe('a');
    expect(getIdFromRoute(route({}))).toBe('');
  });
});
