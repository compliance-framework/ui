<script setup lang="ts">
import { useScrollable } from './useScrollable';

/**
 * A pane that scrolls on its own, inside the fixed app frame (the scroll model): soft fades at the
 * top and bottom show there is more, in the pane's own surface colour. `scrollbar="none"` hides the
 * bar entirely (the sidebar); `hover` shows a thin bar only while the pane is in use. `inset` keeps
 * room for focus rings that the pane's edges would otherwise clip.
 */
withDefaults(
  defineProps<{
    surface?: 'base' | 'raised';
    scrollbar?: 'none' | 'hover';
    inset?: boolean;
  }>(),
  {
    surface: 'base',
    scrollbar: 'hover',
    inset: false,
  },
);
// Marked as a scroll area only while it actually overflows (see base.css).
const { scrollable } = useScrollable('area');
</script>

<template>
  <div
    ref="area"
    class="scroll-area"
    :class="[
      `scroll-area--${surface}`,
      `scroll-area--bar-${scrollbar}`,
      { 'scroll-area--inset': inset },
    ]"
    :data-scroll="scrollbar === 'hover' && scrollable ? '' : undefined"
  >
    <slot />
  </div>
</template>

<style scoped>
.scroll-area {
  --fade-edge: color-mix(in srgb, var(--color-text-primary) 18%, transparent);

  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background:
    linear-gradient(var(--fade-cover), transparent) top / 100% var(--space-8)
      no-repeat local,
    linear-gradient(transparent, var(--fade-cover)) bottom / 100% var(--space-8)
      no-repeat local,
    linear-gradient(var(--fade-edge), transparent) top / 100% var(--space-2)
      no-repeat scroll,
    linear-gradient(transparent, var(--fade-edge)) bottom / 100% var(--space-2)
      no-repeat scroll;
  background-color: var(--fade-cover);
}

.scroll-area--base {
  --fade-cover: var(--color-surface-base);
}

.scroll-area--raised {
  --fade-cover: var(--color-surface-raised);
}

.scroll-area--inset {
  margin: calc((var(--focus-width) + var(--focus-offset)) * -1);
  padding: calc(var(--focus-width) + var(--focus-offset));
}

.scroll-area--bar-none {
  scrollbar-width: none;
}

.scroll-area--bar-none::-webkit-scrollbar {
  display: none;
}
</style>
