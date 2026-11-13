<script setup lang="ts">
import Icon from '../Icon/Icon.vue';

/** The hint and error lines under a field (F-20). The error is icon + text and announced (role="alert"). */
defineProps<{
  hint?: string;
  hintId: string;
  error?: string;
  errorId: string;
}>();
</script>

<template>
  <p v-if="hint" :id="hintId" class="field-hint">{{ hint }}</p>
  <p v-if="error" :id="errorId" class="field-error" role="alert">
    <Icon name="invalid" size="sm" class="field-error__icon" />
    <span>{{ error }}</span>
  </p>
</template>

<style scoped>
.field-hint,
.field-error {
  font-size: var(--font-size-caption);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
}

.field-hint {
  color: var(--color-text-secondary);
}

.field-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  color: var(--color-status-error-fg);
}

.field-error__icon {
  margin-top: calc(
    (var(--font-size-caption) * var(--leading-snug) - var(--size-icon-sm)) / 2
  );
}
</style>
