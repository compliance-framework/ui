<template>
  <input v-model="model" v-bind="$attrs" class="ui-v2-input" />
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const model = defineModel<string>({ default: '' });
</script>

<style scoped>
@reference "@/assets/main.css";

.ui-v2-input {
  width: 100%;
  border: 1px solid var(--ui-v2-border);
  background: var(--ui-v2-background);
  color: var(--ui-v2-foreground);
  padding: 0.5rem 0.75rem;
  font-size: var(--ui-v2-type-body);
  line-height: 1.4;
  outline: none;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.ui-v2-input::placeholder {
  color: var(--ui-v2-tertiary-foreground);
}

.ui-v2-input:focus {
  border-color: var(--ui-v2-primary);
}

.ui-v2-input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
