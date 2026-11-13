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
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}

.field-hint {
  color: var(--ds-color-text-secondary);
}

.field-error {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-1);
  color: var(--ds-color-status-error-fg);
}

.field-error__icon {
  margin-top: calc(
    (
        var(--ds-font-size-caption) * var(--ds-leading-snug) -
          var(--ds-size-icon-sm)
      ) /
      2
  );
}
</style>
