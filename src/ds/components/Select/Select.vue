<script setup lang="ts">
import { computed } from 'vue';
import FieldValue from '../FormField/FieldValue.vue';
import { useFieldControl } from '../FormField/field';
import Icon from '../Icon/Icon.vue';

/**
 * A styled native <select>, the most robust accessible option, wired by its FormField or by
 * `label` when standalone (F-20, F-11). `color-scheme` themes the native popup (F-29).
 * `placeholder` is an empty first option such as "Choose an impact", never the label; it can't be
 * re-chosen when the field is required.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    options: { value: string; label: string; disabled?: boolean }[];
    placeholder?: string;
    label?: string;
  }>(),
  { placeholder: undefined, label: undefined },
);
const model = defineModel<string>({ default: '' });
const { controlAttrs, invalid, required, readonly } = useFieldControl(
  () => props.label,
);
const selectedLabel = computed(
  () => props.options.find((option) => option.value === model.value)?.label,
);
</script>

<template>
  <FieldValue v-if="readonly" :value="selectedLabel" />
  <div v-else class="select">
    <select
      v-model="model"
      v-bind="{ ...$attrs, ...controlAttrs }"
      class="select__control"
      :class="{
        'select__control--invalid': invalid,
        'select__control--placeholder': !selectedLabel,
      }"
    >
      <option v-if="placeholder" value="" :disabled="required">
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <Icon name="expand" class="select__chevron" />
  </div>
</template>

<style scoped>
.select {
  position: relative;
  min-width: 0;
}

.select__control {
  appearance: none;
  width: 100%;
  min-width: 0;
  height: var(--size-control-md);
  margin: 0;
  padding: 0 calc(var(--space-3) + var(--size-icon-md) + var(--space-2)) 0
    var(--space-3);
  background: var(--color-surface-sunken);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  line-height: var(--leading-snug);
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.select__control:hover {
  background: var(--color-surface-base);
}

.select__control--placeholder {
  color: var(--color-text-secondary);
}

.select__control option {
  color: var(--color-text-primary);
}

.select__control--invalid {
  border-color: var(--color-status-error-fg);
}

.select__chevron {
  position: absolute;
  top: calc(50% - var(--size-icon-md) / 2);
  right: var(--space-3);
  color: var(--color-text-secondary);
  pointer-events: none;
}
</style>
