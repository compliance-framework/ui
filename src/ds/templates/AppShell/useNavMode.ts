import { computed, onBeforeUnmount, ref } from 'vue';
import { breakpoints } from '@/ds/tokens/breakpoints';

/**
 * Navigation mode by width (04 §4.1, F-18 AC2): an off-canvas drawer below 1024px, an icon rail
 * at 1024–1439 and the expanded sidebar from 1440. Above 1024 the user can override the default,
 * and the choice is remembered.
 */
export type NavMode = 'drawer' | 'rail' | 'expanded';

const STORAGE_KEY = 'ccf-nav';

export function useNavMode() {
  const desktop = window.matchMedia(`(min-width: ${breakpoints.lg}px)`);
  const wide = window.matchMedia(`(min-width: ${breakpoints.xxl}px)`);
  const isDesktop = ref(desktop.matches);
  const isWide = ref(wide.matches);
  const preference = ref<'rail' | 'expanded' | null>(
    (localStorage.getItem(STORAGE_KEY) as 'rail' | 'expanded' | null) ?? null,
  );

  const update = () => {
    isDesktop.value = desktop.matches;
    isWide.value = wide.matches;
  };
  desktop.addEventListener('change', update);
  wide.addEventListener('change', update);
  onBeforeUnmount(() => {
    desktop.removeEventListener('change', update);
    wide.removeEventListener('change', update);
  });

  const mode = computed<NavMode>(() => {
    if (!isDesktop.value) return 'drawer';
    return preference.value ?? (isWide.value ? 'expanded' : 'rail');
  });

  function toggle(): void {
    preference.value = mode.value === 'expanded' ? 'rail' : 'expanded';
    localStorage.setItem(STORAGE_KEY, preference.value);
  }

  return { mode, toggle };
}
