<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { useScrollable } from '../ScrollArea/useScrollable';

/**
 * Route-bound tabs (DEC-09, F-10 AC7, F-11 AC3, F-30): a tablist of links whose selected tab
 * always comes from the current route, so Back, Forward, refresh and deep links stay correct.
 * Arrow keys, Home and End move focus between tabs; Enter follows the link. The routed view goes
 * in the default slot, which is the tabpanel. Tabs scroll sideways instead of wrapping.
 */
const props = defineProps<{
  label: string;
  tabs: { label: string; to: RouteLocationRaw; count?: number }[];
}>();

const route = useRoute();
const router = useRouter();
const baseId = useId();
const { scrollable } = useScrollable('list', 'horizontal');
const tabRefs = ref<{ $el: HTMLElement }[]>([]);

const selectedIndex = computed(() => {
  const index = props.tabs.findIndex(
    (tab) => router.resolve(tab.to).name === route.name,
  );
  if (index !== -1) return index;
  const ancestor = props.tabs
    .map((tab, at) => ({ at, path: router.resolve(tab.to).path }))
    .filter(
      ({ path }) => route.path === path || route.path.startsWith(`${path}/`),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
  return ancestor?.at ?? 0;
});

// Keep the route's selected tab visible without moving the page's vertical scroller.
function revealSelected(): void {
  const tab = tabRefs.value[selectedIndex.value]?.$el;
  const list = tab?.parentElement;
  if (!tab || !list) return;
  const selected = tab.getBoundingClientRect(),
    viewport = list.getBoundingClientRect();
  if (selected.left < viewport.left)
    list.scrollLeft += selected.left - viewport.left;
  else if (selected.right > viewport.right)
    list.scrollLeft += selected.right - viewport.right;
}
let observer: ResizeObserver | undefined;
onMounted(() => {
  const list = tabRefs.value[0]?.$el.parentElement;
  if (list) {
    observer = new ResizeObserver(revealSelected);
    observer.observe(list);
  }
  revealSelected();
});
watch(selectedIndex, revealSelected, { flush: 'post' });
onBeforeUnmount(() => observer?.disconnect());

function onKeydown(event: KeyboardEvent): void {
  const last = props.tabs.length - 1;
  const current = tabRefs.value.findIndex(
    (tab) => tab.$el === document.activeElement,
  );
  const targets: Record<string, number> = {
    ArrowRight: current === last ? 0 : current + 1,
    ArrowLeft: current === 0 ? last : current - 1,
    Home: 0,
    End: last,
  };
  const target = targets[event.key];
  if (target === undefined || current === -1) return;
  event.preventDefault();
  tabRefs.value[target]?.$el.focus();
}
</script>

<template>
  <div class="tabs">
    <div
      ref="list"
      class="tabs__list"
      role="tablist"
      :aria-label="label"
      :data-scroll="scrollable ? '' : undefined"
    >
      <RouterLink
        v-for="(tab, index) in tabs"
        :id="`${baseId}-tab-${index}`"
        :key="index"
        ref="tabRefs"
        :to="tab.to"
        role="tab"
        class="tabs__tab"
        :aria-selected="index === selectedIndex"
        :aria-controls="`${baseId}-panel`"
        :tabindex="index === selectedIndex ? 0 : -1"
        @keydown="onKeydown"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tabs__count">{{
          tab.count
        }}</span>
      </RouterLink>
    </div>
    <div
      :id="`${baseId}-panel`"
      role="tabpanel"
      class="tabs__panel"
      :aria-labelledby="`${baseId}-tab-${selectedIndex}`"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tabs__list {
  display: flex;
  overflow-x: auto;
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.tabs__tab {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-4);
  border-bottom: var(--ds-border-width-indicator) solid transparent;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-medium);
  letter-spacing: var(--ds-tracking-wide);
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.tabs__tab:hover {
  color: var(--ds-color-text-primary);
  background: var(--ds-color-surface-hover);
}

.tabs__tab[aria-selected='true'] {
  border-bottom-color: var(--ds-color-indicator);
  color: var(--ds-color-text-primary);
  font-weight: var(--ds-font-weight-bold);
}

.tabs__tab:focus-visible {
  outline-offset: calc(var(--ds-focus-width) * -1);
}

.tabs__count {
  padding: 0 var(--ds-space-1);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  font-weight: var(--ds-font-weight-bold);
}

.tabs__panel {
  padding-top: var(--ds-space-6);
}
</style>
