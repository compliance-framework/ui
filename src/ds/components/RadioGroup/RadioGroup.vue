<script setup lang="ts">
import { computed, useId } from 'vue';
import FieldMessages from '../FormField/FieldMessages.vue';
import FieldValue from '../FormField/FieldValue.vue';
import FormField from '../FormField/FormField.vue';
import { joinIds } from '../FormField/field';

/**
 * One choice from a short list: <fieldset> + <legend> with native radios, so arrow keys work
 * natively (F-11). Hint, error and required marker behave like FormField (F-20); the group is a
 * radiogroup so it can carry aria-required and aria-invalid. Read-only shows the chosen option's
 * label as text (F-19 AC2).
 *
 * `segmented` draws the same native radios as a row of joined segments, for a quick filter above a
 * list. Each transparent native input covers its whole segment, so clicks, arrow keys, focus and
 * the checked state are still the browser's. An option's `count` shows after its label in the
 * secondary colour, e.g. "Needs work 5". `legendHidden` keeps the legend for screen readers only,
 * where the options already say what they choose between.
 */
const props = withDefaults(
  defineProps<{
    legend: string;
    options: {
      value: string;
      label: string;
      description?: string;
      count?: number;
    }[];
    hint?: string;
    error?: string;
    required?: boolean;
    readonly?: boolean;
    variant?: 'list' | 'segmented';
    legendHidden?: boolean;
  }>(),
  {
    hint: undefined,
    error: undefined,
    required: false,
    readonly: false,
    variant: 'list',
    legendHidden: false,
  },
);
const model = defineModel<string>({ default: '' });

const name = useId();
const legendId = useId();
const hintId = useId();
const errorId = useId();
const describedBy = computed(() =>
  joinIds(props.hint && hintId, props.error && errorId),
);
const selectedLabel = computed(
  () => props.options.find((option) => option.value === model.value)?.label,
);
</script>

<template>
  <FormField v-if="readonly" :label="legend" readonly>
    <FieldValue :value="selectedLabel" />
  </FormField>
  <fieldset
    v-else
    class="radio-group"
    :class="[`radio-group--${variant}`, { 'radio-group--invalid': error }]"
    role="radiogroup"
    :aria-labelledby="legendId"
    :aria-describedby="describedBy"
    :aria-required="required ? 'true' : undefined"
    :aria-invalid="error ? 'true' : undefined"
  >
    <legend
      :id="legendId"
      class="radio-group__legend"
      :class="{ 'visually-hidden': legendHidden }"
    >
      {{ legend
      }}<span v-if="required" class="radio-group__required" aria-hidden="true"
        >*</span
      >
    </legend>
    <div class="radio-group__body">
      <div v-for="(option, index) in options" :key="option.value" class="radio">
        <span class="radio__control">
          <input
            :id="`${name}-${index}`"
            type="radio"
            class="radio__input"
            :name="name"
            :value="option.value"
            :checked="model === option.value"
            :aria-describedby="
              option.description ? `${name}-${index}-description` : undefined
            "
            @change="model = option.value"
          />
          <span class="radio__dot" aria-hidden="true" />
        </span>
        <div class="radio__text">
          <label :for="`${name}-${index}`" class="radio__label"
            >{{ option.label
            }}<span v-if="option.count !== undefined" class="radio__count">{{
              option.count
            }}</span></label
          >
          <p
            v-if="option.description"
            :id="`${name}-${index}-description`"
            class="radio__description"
          >
            {{ option.description }}
          </p>
        </div>
      </div>
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
.radio-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.radio-group__legend {
  padding: 0 0 var(--ds-space-1);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.radio-group__required {
  margin-inline-start: var(--ds-space-1);
  color: var(--ds-color-status-error-fg);
}

.radio-group__body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.radio {
  display: grid;
  grid-template-columns: var(--ds-size-target-min) minmax(0, 1fr);
  column-gap: var(--ds-space-2);
  align-items: start;
}

.radio__control {
  position: relative;
  display: flex;
  width: var(--ds-size-target-min);
  height: var(--ds-size-target-min);
}

.radio__input {
  appearance: none;
  width: 100%;
  height: 100%;
  margin: 0;
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  cursor: pointer;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.radio__input:hover {
  background: var(--ds-color-surface-base);
}

.radio-group--invalid .radio__input {
  border-color: var(--ds-color-status-error-fg);
}

.radio__input:checked {
  background: var(--ds-color-action-primary-bg);
  border-color: var(--ds-color-action-primary-border);
}

.radio__dot {
  display: none;
  position: absolute;
  inset: 0;
  width: var(--ds-space-2);
  height: var(--ds-space-2);
  margin: auto;
  background: var(--ds-color-action-primary-fg);
  border-radius: var(--ds-radius-round);
  pointer-events: none;
}

.radio__input:checked + .radio__dot {
  display: block;
}

.radio__text {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.radio__label {
  display: flex;
  align-items: center;
  min-height: var(--ds-size-target-min);
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-medium);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
  cursor: pointer;
}

.radio__count {
  margin-inline-start: var(--ds-space-2);
  color: var(--ds-color-text-secondary);
  font-weight: var(--ds-font-weight-regular);
}

.radio__description {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}

/* Segmented: the radios as one row of joined segments; the checked one takes the selected fill. */
.radio-group--segmented .radio-group__body {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0;
}

.radio-group--segmented .radio {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  margin-inline-start: calc(var(--ds-border-width) * -1);
  margin-block-start: calc(var(--ds-border-width) * -1);
}

.radio-group--segmented .radio__control {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
}

.radio-group--segmented .radio__input {
  opacity: 0;
}

.radio-group--segmented .radio__input:checked + .radio__dot {
  display: none;
}

.radio-group--segmented .radio__text {
  flex: 1;
}

.radio-group--segmented .radio__label {
  justify-content: center;
  min-height: var(--ds-size-control-sm);
  padding: 0 var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  background: var(--ds-color-surface-sunken);
  font-size: var(--ds-font-size-label);
  white-space: nowrap;
}

.radio-group--segmented .radio:hover .radio__label {
  background: var(--ds-color-surface-hover);
}

.radio-group--segmented .radio:has(.radio__input:checked) .radio__label {
  position: relative;
  border-color: var(--ds-color-indicator);
  background: var(--ds-color-surface-selected);
  font-weight: var(--ds-font-weight-bold);
}

.radio-group--segmented .radio:has(.radio__input:focus-visible) .radio__label {
  position: relative;
  outline: var(--ds-focus-width) solid var(--ds-color-border-focus);
  outline-offset: calc(var(--ds-focus-width) * -1);
}
</style>
