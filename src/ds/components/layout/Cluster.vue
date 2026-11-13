<script setup lang="ts">
import { spaceVar, type SpaceStep } from './space';

/**
 * A wrapping row, e.g. a set of buttons or badges. Wraps instead of overflowing (1.4.10).
 * `:wrap="false"` keeps one row for a title with trailing markers: the first child takes the
 * space and wraps inside itself, and the rest keep their size at the end.
 */
withDefaults(
  defineProps<{
    gap?: SpaceStep;
    justify?: 'start' | 'between' | 'end';
    align?: 'start' | 'center' | 'baseline' | 'end';
    wrap?: boolean;
    as?: string;
  }>(),
  { gap: '3', justify: 'start', align: 'center', wrap: true, as: 'div' },
);
</script>

<template>
  <component
    :is="as"
    class="cluster"
    :class="[
      `cluster--justify-${justify}`,
      `cluster--align-${align}`,
      { 'cluster--nowrap': !wrap },
    ]"
    :style="{ '--cluster-gap': spaceVar(gap) }"
  >
    <slot />
  </component>
</template>

<style scoped>
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cluster-gap);
  min-width: 0;
}

.cluster--nowrap {
  flex-wrap: nowrap;
}

.cluster--nowrap > :deep(:first-child) {
  flex: 1 1 auto;
  min-width: 0;
}

.cluster--nowrap > :deep(:not(:first-child)) {
  flex: none;
}

.cluster--justify-between {
  justify-content: space-between;
}

.cluster--justify-end {
  justify-content: flex-end;
}

.cluster--align-start {
  align-items: flex-start;
}

.cluster--align-center {
  align-items: center;
}

.cluster--align-baseline {
  align-items: baseline;
}

.cluster--align-end {
  align-items: flex-end;
}
</style>
