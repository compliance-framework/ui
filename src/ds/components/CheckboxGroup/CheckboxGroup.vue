<script setup lang="ts">
import { computed, useId } from 'vue';
import Checkbox from '../Checkbox/Checkbox.vue';
import FieldMessages from '../FormField/FieldMessages.vue';
import FieldValue from '../FormField/FieldValue.vue';
import FormField from '../FormField/FormField.vue';
import { joinIds } from '../FormField/field';

/**
 * Several choices from a short list, e.g. the people in a role: <fieldset> + <legend> with one
 * Checkbox per option, in a column (F-11). Hint, error and required marker behave like RadioGroup
 * (F-20); the screen checks "choose at least one" and passes the error. The model keeps the
 * options' order. Read-only shows the chosen labels as text, or "None" (F-19 AC2).
 * `legendHidden` keeps the legend for screen readers only, where the options speak for themselves.
 */
const props = withDefaults(
  defineProps<{
    legend: string;
    options: { value: string; label: string; description?: string }[];
    hint?: string;
    error?: string;
    required?: boolean;
    readonly?: boolean;
    legendHidden?: boolean;
  }>(),
  {
    hint: undefined,
    error: undefined,
    required: false,
    readonly: false,
    legendHidden: false,
  },
);
const model = defineModel<string[]>({ default: () => [] });

const hintId = useId();
const errorId = useId();
const describedBy = computed(() =>
  joinIds(props.hint && hintId, props.error && errorId),
);
const chosenLabels = computed(
  () =>
    props.options
      .filter((option) => model.value.includes(option.value))
      .map((option) => option.label)
      .join(', ') || 'None',
);

function toggle(value: string, checked: boolean): void {
  model.value = props.options
    .filter((option) =>
      option.value === value ? checked : model.value.includes(option.value),
    )
    .map((option) => option.value);
}
</script>

<template>
  <FormField v-if="readonly" :label="legend" readonly>
    <FieldValue :value="chosenLabels" />
  </FormField>
  <fieldset
    v-else
    class="checkbox-group"
    :class="{ 'checkbox-group--invalid': error }"
    :aria-describedby="describedBy"
    :aria-invalid="error ? 'true' : undefined"
  >
    <legend
      class="checkbox-group__legend"
      :class="{ 'visually-hidden': legendHidden }"
    >
      {{ legend
      }}<span
        v-if="required"
        class="checkbox-group__required"
        aria-hidden="true"
        >*</span
      >
    </legend>
    <div class="checkbox-group__body">
      <Checkbox
        v-for="option in options"
        :key="option.value"
        :model-value="model.includes(option.value)"
        :label="option.label"
        :description="option.description"
        @update:model-value="(checked) => toggle(option.value, checked)"
      />
      <FieldMessages
        :hint="hint"
        :hint-id="hintId"
        :error="error"
        :error-id="errorId"
      />
    </div>
  </fieldset>
</template>

<style scoped>
.checkbox-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.checkbox-group__legend {
  padding: 0 0 var(--ds-space-1);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.checkbox-group__required {
  margin-inline-start: var(--ds-space-1);
  color: var(--ds-color-status-error-fg);
}

.checkbox-group__body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

/* Like RadioGroup: an invalid group outlines its unchecked boxes in the error colour. */
.checkbox-group--invalid :deep(.checkbox__input:not(:checked)) {
  border-color: var(--ds-color-status-error-fg);
}
</style>
