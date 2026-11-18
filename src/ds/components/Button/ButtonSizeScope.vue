<script setup lang="ts">
import { provide } from 'vue';
import { buttonSizeKey } from './buttonSize';

/**
 * Sets the default size of the Buttons and IconButtons inside it, e.g. small in a panel's header
 * actions. A button's own `size` still wins. Renders no element of its own.
 */
const props = defineProps<{ size: 'sm' | 'md' }>();
provide(buttonSizeKey, props.size);
</script>

<template>
  <slot />
</template>
