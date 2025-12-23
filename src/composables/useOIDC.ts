import { ref } from 'vue';
import { useConfigStore } from '@/stores/config';
import { useGuestApi } from '@/composables/axios';

export interface OIDCProvider {
  name: string;
  displayName: string;
  enabled: boolean;
  iconUrl?: string;
}

export function useOIDC() {
  const configStore = useConfigStore();
  const providers = ref<OIDCProvider[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const { execute: fetchProviders, data: providersData } = useGuestApi<
    OIDCProvider[]
  >('/api/auth/sso/providers', { method: 'GET' }, { immediate: false });

  const loadProviders = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await fetchProviders();
      const fetchedProviders = providersData.value ?? [];
      providers.value = fetchedProviders.filter(
        (provider) => provider.enabled !== false,
      );
    } catch (_error) {
      console.error('Failed to load SSO providers:');
      error.value = 'Failed to load SSO providers';
      providers.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const initiateLogin = async (providerName: string) => {
    const provider = providers.value.find(
      (p) => p.name === providerName && p.enabled !== false,
    );
    if (!provider) {
      const unavailableMessage = 'Selected SSO provider is not available.';
      error.value = unavailableMessage;
      throw new Error(unavailableMessage);
    }
    let config;
    try {
      config = await configStore.getConfig();
    } catch (err) {
      error.value = 'Failed to initiate SSO login';
      throw err instanceof Error ? err : new Error('SSO init failed');
    }
    window.location.href = `${config.API_URL}/api/auth/sso/${provider.name}`;
  };

  return {
    providers,
    isLoading,
    error,
    loadProviders,
    initiateLogin,
  };
}
