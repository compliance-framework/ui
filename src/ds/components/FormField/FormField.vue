<script setup lang="ts">
import { computed, provide, useId } from 'vue';
import FieldMessages from './FieldMessages.vue';
import { fieldKey, joinIds } from './field';

/**
 * The wrapper every form field uses (F-20 AC1, F-11): a visible label tied to the control, a hint
 * and an error below it wired with aria-describedby, and a visible required marker (the control
 * gets aria-required). The child input picks up ids and state through provide/inject.
 * Read-only shows the value as text under the label, never a locked input (F-19 AC2).
 */
const props = withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    readonly?: boolean;
  }>(),
  { hint: undefined, error: undefined, required: false, readonly: false },
);

const controlId = useId();
const hintId = useId();
const errorId = useId();
// Hints and errors are about editing, so read-only users don't see them.
const hint = computed(() => (props.readonly ? undefined : props.hint));
const error = computed(() => (props.readonly ? undefined : props.error));

provide(fieldKey, {
  controlId,
  describedBy: computed(() =>
    joinIds(hint.value && hintId, error.value && errorId),
  ),
  invalid: computed(() => Boolean(error.value)),
  required: computed(() => props.required && !props.readonly),
  readonly: computed(() => props.readonly),
});
</script>

<template>
  <div class="form-field">
    <span v-if="readonly" class="form-field__label">{{ label }}</span>
    <label v-else :for="controlId" class="form-field__label">
      {{ label
      }}<span v-if="required" class="form-field__required" aria-hidden="true"
        >*</span
      >
    </label>
    <slot />
    <FieldMessages
      :hint="hint"
      :hint-id="hintId"
      :error="error"
      :error-id="errorId"
    />
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.form-field__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-snug);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.form-field__required {
  margin-inline-start: var(--space-1);
  color: var(--color-status-error-fg);
}
</style>
