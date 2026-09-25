import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

// Generic persisted open/closed state for CollapsableGroup instances, keyed by an
// arbitrary caller-supplied string. Opt-in via CollapsableGroup's `persistKey` prop — used
// where a page wants its expand/collapse tree (e.g. a catalog's groups and controls) to
// survive a hard refresh, rather than always resetting collapsed on mount.
export const useCollapsibleGroupsStore = defineStore(
  'collapsibleGroups',
  () => {
    const openKeys = useLocalStorage<string[]>('collapsibleGroupsOpen', []);

    function isOpen(key: string): boolean {
      return openKeys.value.includes(key);
    }

    function setOpen(key: string, open: boolean) {
      if (open === isOpen(key)) {
        return;
      }
      openKeys.value = open
        ? [...openKeys.value, key]
        : openKeys.value.filter((openKey) => openKey !== key);
    }

    return {
      openKeys,
      isOpen,
      setOpen,
    };
  },
);
