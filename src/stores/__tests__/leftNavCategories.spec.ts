import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useLeftNavCategoriesStore } from '../leftNavCategories';

describe('useLeftNavCategoriesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('reports categories as closed by default', () => {
    const store = useLeftNavCategoriesStore();
    expect(store.isOpen('Control Definitions')).toBe(false);
  });

  it('remembers an opened category independently of others', () => {
    const store = useLeftNavCategoriesStore();
    store.setOpen('Control Definitions', true);

    expect(store.isOpen('Control Definitions')).toBe(true);
    expect(store.isOpen('Workflows')).toBe(false);

    store.setOpen('Control Definitions', false);
    expect(store.isOpen('Control Definitions')).toBe(false);
  });

  it('persists open categories to localStorage across a fresh store instance', async () => {
    const first = useLeftNavCategoriesStore();
    first.setOpen('Admin', true);
    // useLocalStorage writes to storage via a watcher, not synchronously on assignment.
    await nextTick();

    // Simulates a hard refresh: a brand new Pinia instance, but the same localStorage.
    setActivePinia(createPinia());
    const second = useLeftNavCategoriesStore();

    expect(second.isOpen('Admin')).toBe(true);
  });
});
