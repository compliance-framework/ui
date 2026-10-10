import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from './uuid';

const V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('uuid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to crypto.randomUUID when available', () => {
    const spy = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('11111111-1111-4111-8111-111111111111');

    expect(uuid()).toBe('11111111-1111-4111-8111-111111111111');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('falls back to a v4 UUID when crypto.randomUUID is unavailable', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      undefined as unknown as `${string}-${string}-${string}-${string}-${string}`,
    );
    // Force the typeof check to treat randomUUID as missing.
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined });

    const result = uuid();
    expect(result).toMatch(V4_PATTERN);

    vi.unstubAllGlobals();
  });

  it('produces distinct values from the fallback', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });

    const values = new Set(Array.from({ length: 1000 }, () => uuid()));
    expect(values.size).toBe(1000);

    vi.unstubAllGlobals();
  });
});
