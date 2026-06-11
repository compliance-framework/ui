import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfigStore } from './config';

function mockConfigResponse(config: Record<string, unknown>) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(config),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('config store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_LOGIN_BANNER', undefined);
    vi.stubEnv('VITE_LOGIN_BANNER_SEVERITY', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('resolves LOGIN_BANNER from config.json', async () => {
    mockConfigResponse({
      API_URL: 'https://api.example.test',
      LOGIN_BANNER: 'Scheduled maintenance Saturday 02:00 UTC',
      LOGIN_BANNER_SEVERITY: 'warn',
    });

    const config = await useConfigStore().getConfig();

    expect(config.LOGIN_BANNER).toBe(
      'Scheduled maintenance Saturday 02:00 UTC',
    );
    expect(config.LOGIN_BANNER_SEVERITY).toBe('warn');
  });

  it('uses no banner and info severity by default', async () => {
    mockConfigResponse({
      API_URL: 'https://api.example.test',
    });

    const config = await useConfigStore().getConfig();

    expect(config.LOGIN_BANNER).toBe('');
    expect(config.LOGIN_BANNER_SEVERITY).toBe('info');
  });

  it('falls back to info for an invalid severity', async () => {
    mockConfigResponse({
      LOGIN_BANNER: 'Authorized use only',
      LOGIN_BANNER_SEVERITY: 'critical',
    });

    const config = await useConfigStore().getConfig();

    expect(config.LOGIN_BANNER).toBe('Authorized use only');
    expect(config.LOGIN_BANNER_SEVERITY).toBe('info');
  });

  it('lets VITE_LOGIN_BANNER override config.json', async () => {
    vi.stubEnv('VITE_LOGIN_BANNER', 'Build-time notice');
    vi.stubEnv('VITE_LOGIN_BANNER_SEVERITY', 'error');
    mockConfigResponse({
      LOGIN_BANNER: 'Runtime notice',
      LOGIN_BANNER_SEVERITY: 'warn',
    });

    const config = await useConfigStore().getConfig();

    expect(config.LOGIN_BANNER).toBe('Build-time notice');
    expect(config.LOGIN_BANNER_SEVERITY).toBe('error');
  });

  it('treats an empty VITE_LOGIN_BANNER as an explicit disable', async () => {
    vi.stubEnv('VITE_LOGIN_BANNER', '');
    mockConfigResponse({
      LOGIN_BANNER: 'Runtime notice',
      LOGIN_BANNER_SEVERITY: 'warn',
    });

    const config = await useConfigStore().getConfig();

    expect(config.LOGIN_BANNER).toBe('');
    expect(config.LOGIN_BANNER_SEVERITY).toBe('warn');
  });

  it('applies banner overrides when VITE_API_URL skips the config.json fetch', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    vi.stubEnv('VITE_LOGIN_BANNER', 'Local build notice');
    vi.stubEnv('VITE_LOGIN_BANNER_SEVERITY', 'success');
    const fetchMock = mockConfigResponse({
      LOGIN_BANNER: 'Runtime notice',
    });

    const config = await useConfigStore().getConfig();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(config.API_URL).toBe('https://api.example.test');
    expect(config.LOGIN_BANNER).toBe('Local build notice');
    expect(config.LOGIN_BANNER_SEVERITY).toBe('success');
  });
});
