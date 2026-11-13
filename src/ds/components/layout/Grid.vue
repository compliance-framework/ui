<script setup lang="ts">
import { spaceVar, type SpaceStep } from './space';

/** Responsive columns: as many as fit at the given minimum width, down to one column at 320px. */
withDefaults(defineProps<{ min?: 'sm' | 'md' | 'lg'; gap?: SpaceStep }>(), {
  min: 'md',
  gap: '4',
});
</script>

<template>
  <div
    class="grid"
    :style="{
      '--grid-min': `var(--ds-width-column-${min})`,
      '--grid-gap': spaceVar(gap),
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--grid-min)), 1fr)
  );
  gap: var(--grid-gap);
}
</style>
