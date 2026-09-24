import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

// Which left-hand-nav categories (keyed by their title, e.g. "Control Definitions") the
// user has expanded — persisted so a manually-opened submenu stays open across a hard
// refresh or a new session, even if nothing under it was ever selected.
export const useLeftNavCategoriesStore = defineStore(
  'leftNavCategories',
  () => {
    const openTitles = useLocalStorage<string[]>('leftNavOpenCategories', []);

    function isOpen(title: string): boolean {
      return openTitles.value.includes(title);
    }

    function setOpen(title: string, open: boolean) {
      if (open === isOpen(title)) {
        return;
      }
      openTitles.value = open
        ? [...openTitles.value, title]
        : openTitles.value.filter((openTitle) => openTitle !== title);
    }

    return {
      openTitles,
      isOpen,
      setOpen,
    };
  },
);
