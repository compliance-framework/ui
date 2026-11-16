<script setup lang="ts">
/** The top list of a disclosure tree: holds TreeItems, named by `label`. */
defineProps<{ label: string }>();
</script>

<template>
  <ul class="tree" :aria-label="label">
    <slot />
  </ul>
</template>

<style scoped>
.tree {
  margin: 0;
  padding: 0;
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}
</style>
