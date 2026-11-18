<script setup lang="ts">
import { icons, type IconName } from './icons';

/**
 * Decorative by default (aria-hidden); pass `label` only when the icon carries meaning on its own.
 * `weight="bold"` thickens the stroke, e.g. to show a toggle is on.
 */
withDefaults(
  defineProps<{
    name: IconName;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    weight?: 'regular' | 'bold';
  }>(),
  {
    size: 'md',
    label: undefined,
    weight: 'regular',
  },
);
</script>

<template>
  <component
    :is="icons[name]"
    class="icon"
    :class="`icon--${size}`"
    :stroke-width="weight === 'bold' ? 3 : 2"
    focusable="false"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  />
</template>

<style scoped>
.icon {
  flex: none;
}

.icon--sm {
  width: var(--ds-size-icon-sm);
  height: var(--ds-size-icon-sm);
}

.icon--md {
  width: var(--ds-size-icon-md);
  height: var(--ds-size-icon-md);
}

.icon--lg {
  width: var(--ds-size-icon-lg);
  height: var(--ds-size-icon-lg);
}
</style>
