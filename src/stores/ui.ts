import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore(
  'ui',
  () => {
    const controlImplementationExpandedKeys = ref<Record<string, boolean>>({});
    const controlImplementationSelectedRequirementId = ref<string | null>(null);
    const controlImplementationDrawerOpen = ref(false);
    const evidenceFilter = ref<string>('');

    function setExpandedKeys(keys: Record<string, boolean>) {
      controlImplementationExpandedKeys.value = keys;
    }

    function setSelectedRequirementId(id: string | null) {
      controlImplementationSelectedRequirementId.value = id;
    }

    function setDrawerOpen(open: boolean) {
      controlImplementationDrawerOpen.value = open;
    }

    function setEvidenceFilter(filter: string) {
      evidenceFilter.value = filter;
    }

    return {
      controlImplementationExpandedKeys,
      controlImplementationSelectedRequirementId,
      controlImplementationDrawerOpen,
      evidenceFilter,
      setExpandedKeys,
      setSelectedRequirementId,
      setDrawerOpen,
      setEvidenceFilter,
    };
  },
  {
    persist: true,
  },
);
