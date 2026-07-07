import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LineageScope } from '@/composables/useLineage/types';

export const LINEAGE_ROOT_TYPES = ['standard', 'policy', 'procedure'] as const;
export type LineageRootType = (typeof LINEAGE_ROOT_TYPES)[number];

/**
 * Scope shared by the lineage tree, graph and dashboard widget: which SSP and
 * component the metrics are computed against, and which root types to show.
 * Persisted so the demo keeps its filters across reloads and view switches.
 */
export const useLineageScopeStore = defineStore(
  'lineageScope',
  () => {
    const sspId = ref<string | null>(null);
    const componentId = ref<string | null>(null);
    const types = ref<string[]>([...LINEAGE_ROOT_TYPES]);

    // Plain object consumed by useLineage() fetchers.
    const scope = computed<LineageScope>(() => ({
      sspId: sspId.value,
      componentId: componentId.value,
      types: types.value,
    }));

    function setSspId(id: string | null) {
      sspId.value = id;
      // A component belongs to an SSP, so clear it when the SSP changes.
      componentId.value = null;
    }

    function setComponentId(id: string | null) {
      componentId.value = id;
    }

    function setTypes(next: string[]) {
      // Never allow an empty filter — fall back to all types.
      types.value = next.length ? next : [...LINEAGE_ROOT_TYPES];
    }

    return {
      sspId,
      componentId,
      types,
      scope,
      setSspId,
      setComponentId,
      setTypes,
    };
  },
  {
    persist: true,
  },
);
