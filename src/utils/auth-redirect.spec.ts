import { describe, expect, it } from 'vitest';
import { resolveAuthNextLocation } from './auth-redirect';

describe('auth redirect utilities', () => {
  it('returns a same-origin relative path with query and hash', () => {
    expect(
      resolveAuthNextLocation('/workflow-instances?tab=open#step'),
    ).toEqual({
      path: '/workflow-instances?tab=open#step',
    });
  });

  it('falls back home for missing or non-string values', () => {
    expect(resolveAuthNextLocation(undefined)).toEqual({ name: 'home' });
    expect(resolveAuthNextLocation(['/' as string])).toEqual({ name: 'home' });
    expect(resolveAuthNextLocation('')).toEqual({ name: 'home' });
  });

  it('falls back home for absolute or protocol-relative URLs', () => {
    expect(resolveAuthNextLocation('https://example.com')).toEqual({
      name: 'home',
    });
    expect(resolveAuthNextLocation('//example.com/path')).toEqual({
      name: 'home',
    });
  });
});
