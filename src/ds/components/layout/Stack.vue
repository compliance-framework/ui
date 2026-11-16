<script setup lang="ts">
import { spaceVar, type SpaceStep } from './space';

/**
 * Vertical rhythm: children in a column separated by a spacing token. Children stretch to full
 * width by default (fields, panels); `align="start"` keeps buttons and badges at their own width.
 */
withDefaults(
  defineProps<{ gap?: SpaceStep; align?: 'stretch' | 'start'; as?: string }>(),
  {
    gap: '4',
    align: 'stretch',
    as: 'div',
  },
);
</script>

<template>
  <component
    :is="as"
    class="stack"
    :class="`stack--${align}`"
    :style="{ '--stack-gap': spaceVar(gap) }"
    ><slot
  /></component>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--stack-gap);
  min-width: 0;
}

.stack--start {
  align-items: flex-start;
}

/* As a list (`as="ul"`), the items are laid out, not bulleted. */
:is(ul, ol).stack {
  padding: 0;
  list-style: none;
}
</style>
