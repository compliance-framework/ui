<script setup lang="ts">
import { computed, useId } from 'vue';
import FieldValue from '../FormField/FieldValue.vue';
import FormField from '../FormField/FormField.vue';
import { joinIds } from '../FormField/field';
import Icon from '../Icon/Icon.vue';

/**
 * A native checkbox drawn as a square box with a check icon, with its own visible label and an
 * optional description (F-11, F-20). Disabled only with a reason (P7, F-19 AC3): it stays
 * focusable with aria-disabled and the reason is shown as text below, never hidden.
 * Read-only shows "Yes" or "No" as text (F-19 AC2).
 */
const props = withDefaults(
  defineProps<{
    label: string;
    accessibleLabel?: string;
    description?: string;
    disabledReason?: string;
    readonly?: boolean;
    indeterminate?: boolean;
  }>(),
  {
    accessibleLabel: undefined,
    description: undefined,
    disabledReason: undefined,
    readonly: false,
    indeterminate: false,
  },
);
const model = defineModel<boolean>({ default: false });

const id = useId();
const descriptionId = useId();
const reasonId = useId();
const describedBy = computed(() =>
  joinIds(props.description && descriptionId, props.disabledReason && reasonId),
);

function onClick(event: MouseEvent): void {
  if (props.disabledReason) event.preventDefault();
}

function onChange(event: Event): void {
  model.value = (event.target as HTMLInputElement).checked;
}
</script>

<template>
  <FormField v-if="readonly" :label="label" readonly>
    <FieldValue :value="model ? 'Yes' : 'No'" />
  </FormField>
  <div
    v-else
    class="checkbox"
    :class="{ 'checkbox--disabled': disabledReason }"
  >
    <span class="checkbox__control">
      <input
        :id="id"
        type="checkbox"
        class="checkbox__input"
        :checked="model"
        :indeterminate="indeterminate"
        :aria-label="accessibleLabel"
        :aria-disabled="disabledReason ? 'true' : undefined"
        :aria-describedby="describedBy"
        @click="onClick"
        @change="onChange"
      />
      <Icon
        v-if="model || indeterminate"
        :name="indeterminate ? 'selectionMixed' : 'check'"
        class="checkbox__check"
      />
    </span>
    <div class="checkbox__text">
      <label :for="id" class="checkbox__label">{{ label }}</label>
      <p v-if="description" :id="descriptionId" class="checkbox__note">
        {{ description }}
      </p>
      <p v-if="disabledReason" :id="reasonId" class="checkbox__note">
        {{ disabledReason }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.checkbox {
  display: grid;
  grid-template-columns: var(--size-target-min) minmax(0, 1fr);
  column-gap: var(--space-2);
  align-items: start;
}

.checkbox__control {
  position: relative;
  display: flex;
  width: var(--size-target-min);
  height: var(--size-target-min);
}

.checkbox__input {
  appearance: none;
  width: 100%;
  height: 100%;
  margin: 0;
  background: var(--color-surface-sunken);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.checkbox__input:hover {
  background: var(--color-surface-base);
}

.checkbox__input:checked,
.checkbox__input:indeterminate {
  background: var(--color-action-primary-bg);
  border-color: var(--color-action-primary-border);
}

.checkbox__check {
  position: absolute;
  inset: 0;
  margin: auto;
  color: var(--color-action-primary-fg);
  pointer-events: none;
}

.checkbox__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.checkbox__label {
  display: flex;
  align-items: center;
  min-height: var(--size-target-min);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
  cursor: pointer;
}

.checkbox__note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
}

.checkbox--disabled .checkbox__input,
.checkbox--disabled .checkbox__input:hover,
.checkbox--disabled .checkbox__input:checked,
.checkbox--disabled .checkbox__input:indeterminate {
  background: transparent;
  border: var(--border-width) dashed var(--color-border-strong);
  cursor: not-allowed;
}

.checkbox--disabled .checkbox__check,
.checkbox--disabled .checkbox__label {
  color: var(--color-text-disabled);
}

.checkbox--disabled .checkbox__label {
  cursor: not-allowed;
}
</style>
