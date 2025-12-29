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
     * ID of the currently selected requirement in the Control Implementation view.
     */
    const controlImplementationSelectedRequirementId = ref<string | null>(null);

    /**
     * Controls the visibility of the detail drawer in the Control Implementation view.
     */
    const controlImplementationDrawerOpen = ref(false);

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
     * Sets the currently selected requirement ID.
     * @param id - The UUID of the requirement or null to clear selection.
     */
    function setControlImplementationSelectedRequirementId(id: string | null) {
      controlImplementationSelectedRequirementId.value = id;
    }

    /**
     * Controls the open/closed state of the Control Implementation drawer.
     * @param open - Whether the drawer should be open.
     */
    function setControlImplementationDrawerOpen(open: boolean) {
      controlImplementationDrawerOpen.value = open;
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
      controlImplementationSelectedRequirementId,
      controlImplementationDrawerOpen,
      evidenceFilter,
      setControlImplementationExpandedKeys,
      setControlImplementationSelectedRequirementId,
      setControlImplementationDrawerOpen,
      setEvidenceFilter,
    };
  },
  {
    persist: true,
  },
);
