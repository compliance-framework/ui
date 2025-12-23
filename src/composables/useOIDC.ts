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
      providers.value = providersData.value ?? [];
    } catch (_error) {
      console.error('Failed to load SSO providers:', _error);
      error.value = 'Failed to load SSO providers';
      providers.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const initiateLogin = async (providerName: string) => {
    try {
      const config = await configStore.getConfig();
      window.location.href = `${config.API_URL}/api/auth/sso/${providerName}`;
    } catch (_error) {
      console.error('Failed to initiate SSO login:', _error);
      error.value = 'Failed to initiate SSO login';
    }
  };

  return {
    providers,
    isLoading,
    error,
    loadProviders,
    initiateLogin,
  };
}
