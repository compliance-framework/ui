import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * UI Store for managing global interface state across the application.
 *
 * This store handles state that needs to persist across navigation and sessions,
 * such as filter settings, drawer states, and expanded tree nodes.
 *
 * persistence: true - State is cached in localStorage via pinia-plugin-persistedstate.
 */
export const useUIStore = defineStore(
  'ui',
  () => {
    /**
     * Map of expanded node keys in the Control Implementation tree.
     * Used to maintain tree expansion state across navigations.
     */
    const controlImplementationExpandedKeys = ref<Record<string, boolean>>({});

    /**
     * The active filter string for the Evidence view.
     */
    const evidenceFilter = ref<string>('');

    /**
     * Updates the expanded keys for the Control Implementation tree.
     * @param keys - Object mapping node keys to their expansion state (boolean).
     */
    function setControlImplementationExpandedKeys(
      keys: Record<string, boolean>,
    ) {
      controlImplementationExpandedKeys.value = keys;
    }

    /**
     * Updates the evidence search filter.
     * @param filter - The search query string.
     */
    function setEvidenceFilter(filter: string) {
      evidenceFilter.value = filter;
    }

    return {
      controlImplementationExpandedKeys,
      evidenceFilter,
      setControlImplementationExpandedKeys,
      setEvidenceFilter,
    };
  },
  {
    persist: true,
  },
);
