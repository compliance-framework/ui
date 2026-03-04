import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

type Density = 'comfortable' | 'compact';

export const useUIV2Store = defineStore('ui-v2', () => {
  const tableDensity = useLocalStorage<Density>(
    'ui-v2.table-density',
    'comfortable',
  );
  const showScopeBanner = useLocalStorage<boolean>(
    'ui-v2.show-scope-banner',
    true,
  );

  function setTableDensity(density: Density) {
    tableDensity.value = density;
  }

  function toggleScopeBanner() {
    showScopeBanner.value = !showScopeBanner.value;
  }

  return {
    tableDensity,
    showScopeBanner,
    setTableDensity,
    toggleScopeBanner,
  };
});
