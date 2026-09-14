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
     * Map of expanded node keys in the Compliance Map (lineage) tree.
     * Used to maintain tree expansion state across navigations.
     */
    const lineageExpandedKeys = ref<Record<string, boolean>>({});

    /**
     * Key of the currently selected node in the Compliance Map tree.
     */
    const lineageSelectedNodeKey = ref<string | null>(null);

    /**
     * Controls the visibility of the detail drawer in the Compliance Map view.
     */
    const lineageDrawerOpen = ref(false);

    /**
     * Ordered keys of the nodes drilled into on the Compliance Map graph view
     * (one per column). Used to rebuild the column drill-down on remount.
     */
    const lineageGraphPath = ref<string[]>([]);

    /**
     * Key of the currently selected node in the Compliance Map graph view.
     */
    const lineageGraphSelectedNodeKey = ref<string | null>(null);

    /**
     * Controls the visibility of the detail drawer in the Compliance Map graph view.
     */
    const lineageGraphDrawerOpen = ref(false);

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

    /**
     * Updates the expanded keys for the Compliance Map tree.
     * @param keys - Object mapping node keys to their expansion state (boolean).
     */
    function setLineageExpandedKeys(keys: Record<string, boolean>) {
      lineageExpandedKeys.value = keys;
    }

    /**
     * Sets the currently selected node key in the Compliance Map tree.
     * @param key - The node key or null to clear selection.
     */
    function setLineageSelectedNodeKey(key: string | null) {
      lineageSelectedNodeKey.value = key;
    }

    /**
     * Controls the open/closed state of the Compliance Map drawer.
     * @param open - Whether the drawer should be open.
     */
    function setLineageDrawerOpen(open: boolean) {
      lineageDrawerOpen.value = open;
    }

    /**
     * Updates the drill-down path for the Compliance Map graph view.
     * @param path - Ordered list of selected node keys, one per column.
     */
    function setLineageGraphPath(path: string[]) {
      lineageGraphPath.value = path;
    }

    /**
     * Sets the currently selected node key in the Compliance Map graph view.
     * @param key - The node key or null to clear selection.
     */
    function setLineageGraphSelectedNodeKey(key: string | null) {
      lineageGraphSelectedNodeKey.value = key;
    }

    /**
     * Controls the open/closed state of the Compliance Map graph view drawer.
     * @param open - Whether the drawer should be open.
     */
    function setLineageGraphDrawerOpen(open: boolean) {
      lineageGraphDrawerOpen.value = open;
    }

    return {
      controlImplementationExpandedKeys,
      controlImplementationSelectedRequirementId,
      controlImplementationDrawerOpen,
      evidenceFilter,
      lineageExpandedKeys,
      lineageSelectedNodeKey,
      lineageDrawerOpen,
      lineageGraphPath,
      lineageGraphSelectedNodeKey,
      lineageGraphDrawerOpen,
      setControlImplementationExpandedKeys,
      setControlImplementationSelectedRequirementId,
      setControlImplementationDrawerOpen,
      setEvidenceFilter,
      setLineageExpandedKeys,
      setLineageSelectedNodeKey,
      setLineageDrawerOpen,
      setLineageGraphPath,
      setLineageGraphSelectedNodeKey,
      setLineageGraphDrawerOpen,
    };
  },
  {
    persist: true,
  },
);
