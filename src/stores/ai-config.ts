import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import { buildDashboardSuggestionsConfigEndpoint } from '@/views/dashboard/partials/dashboard-suggestions';

interface DashboardSuggestionsConfig {
  enabled: boolean;
}

export const useAiConfigStore = defineStore('ai-config', () => {
  const fetched = ref(false);
  const enabled = ref(false);

  const { execute, isLoading, error } = useDataApi<DashboardSuggestionsConfig>(
    null,
    null,
    { immediate: false },
  );

  async function fetchDashboardSuggestionsConfig() {
    if (fetched.value) {
      return enabled.value;
    }

    try {
      const response = await execute(buildDashboardSuggestionsConfigEndpoint());
      const config = response?.data.value?.data;
      enabled.value = Boolean(config?.enabled);
    } catch {
      enabled.value = false;
    } finally {
      fetched.value = true;
    }

    return enabled.value;
  }

  return {
    dashboardSuggestionsEnabled: computed(() => enabled.value),
    dashboardSuggestionsConfigFetched: computed(() => fetched.value),
    dashboardSuggestionsConfigLoading: isLoading,
    dashboardSuggestionsConfigError: error,
    fetchDashboardSuggestionsConfig,
  };
});
