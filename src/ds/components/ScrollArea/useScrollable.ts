import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';

/**
 * Whether the element under template ref `key` overflows on one axis. Dialog bodies (vertical) and
 * tables on narrow screens (horizontal) use it to become a focusable, labelled scroll region only
 * when they actually scroll, so short or fitting ones add no tab stop.
 */
export function useScrollable(
  key: string,
  axis: 'vertical' | 'horizontal' = 'vertical',
) {
  const el = useTemplateRef<HTMLElement>(key);
  const scrollable = ref(false);
  let observer: ResizeObserver | undefined;

  function update(): void {
    const element = el.value;
    if (!element) return void (scrollable.value = false);
    scrollable.value =
      axis === 'vertical'
        ? element.scrollHeight > element.clientHeight
        : element.scrollWidth > element.clientWidth;
  }

  watch(el, (element) => {
    observer?.disconnect();
    if (!element) return;
    observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    update();
  });
  onBeforeUnmount(() => observer?.disconnect());

  return { scrollable, el };
}
