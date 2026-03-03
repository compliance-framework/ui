<template>
  <button v-bind="$attrs" class="ui-v2-primary-button">
    <slot />
  </button>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});
</script>

<style scoped>
@reference "@/assets/main.css";

.ui-v2-primary-button {
  width: 100%;
  border: 1px solid var(--ui-v2-primary);
  background: var(--ui-v2-primary);
  color: var(--ui-v2-primary-foreground);
  padding: 0.625rem 0.75rem;
  font-size: var(--ui-v2-type-nav);
  font-weight: 700;
  letter-spacing: var(--ui-v2-tracking-wide);
  text-transform: uppercase;
  transition:
    filter 140ms ease,
    opacity 140ms ease;
}

.ui-v2-primary-button:hover:not(:disabled) {
  filter: brightness(0.96);
}

.ui-v2-primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
