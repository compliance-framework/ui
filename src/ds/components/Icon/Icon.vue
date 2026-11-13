<script setup lang="ts">
import { icons, type IconName } from './icons';

/** Decorative by default (aria-hidden); pass `label` only when the icon carries meaning on its own. */
withDefaults(
  defineProps<{ name: IconName; size?: 'sm' | 'md' | 'lg'; label?: string }>(),
  {
    size: 'md',
    label: undefined,
  },
);
</script>

<template>
  <component
    :is="icons[name]"
    class="icon"
    :class="`icon--${size}`"
    :stroke-width="2"
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
  width: var(--size-icon-sm);
  height: var(--size-icon-sm);
}

.icon--md {
  width: var(--size-icon-md);
  height: var(--size-icon-md);
}

.icon--lg {
  width: var(--size-icon-lg);
  height: var(--size-icon-lg);
}
</style>
