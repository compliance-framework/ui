import { ref } from 'vue';
import { useConfigStore } from '@/stores/config';
import { useGuestApi } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';

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
    } catch (e) {
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
    } catch (e) {
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
