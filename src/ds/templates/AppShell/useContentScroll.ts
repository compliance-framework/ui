import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue';
import { useRouter } from 'vue-router';

const saved = new Map<number, { path: string; top: number }>();

/**
 * Scroll position for the content area, which is the page's only scroller (the window doesn't
 * scroll, so the router's own scroll handling can't apply). A new page starts at the top; Back and
 * Forward return to where the user was; a query-only change (sorting, filtering) keeps the place.
 * Explicit section hashes select their contained target. App and guest frames share history positions.
 */
export function useContentScroll(main: Ref<HTMLElement | undefined>): void {
  const router = useRouter();
  const entry = () => Number(window.history.state?.position ?? 0);
  // On Back/Forward the browser has already switched entries before the router runs, so the
  // entry being left is tracked here rather than read from history.
  let current = entry();
  // The router's history calls its listeners only for Back/Forward, before the navigation starts.
  let returning = false;
  const stopListening = router.options.history.listen(() => (returning = true));

  function scrollHash(hash: string): boolean {
    if (!hash) return false;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return false;
    }
    const target = document.getElementById(id);
    if (!target || !main.value?.contains(target)) return false;
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
    if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    return true;
  }

  const stopBefore = router.beforeEach((_to, from) => {
    if (main.value)
      saved.set(current, { path: from.path, top: main.value.scrollTop });
  });
  const stopAfter = router.afterEach(async (to, from, failure) => {
    const restore = returning;
    returning = false;
    if (failure) return;
    current = entry();
    if (to.path === from.path && to.hash === from.hash) return;
    await nextTick();
    const position = saved.get(current);
    if (restore && position?.path === to.path)
      main.value?.scrollTo({ top: position.top });
    else if (!scrollHash(to.hash)) main.value?.scrollTo({ top: 0 });
  });

  onMounted(async () => {
    await nextTick();
    const route = router.currentRoute.value;
    const position = saved.get(entry());
    if (position?.path === route.path)
      main.value?.scrollTo({ top: position.top });
    else scrollHash(route.hash);
  });

  onBeforeUnmount(() => {
    stopListening();
    stopBefore();
    stopAfter();
  });
}
