<script setup lang="ts">
import { computed } from 'vue';
import TextCompletion from './TextCompletion.vue';
import FieldValue from '../FormField/FieldValue.vue';
import { useFieldControl } from '../FormField/field';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';
import { formatDate } from '@/ds/format';

/**
 * Single-line text entry (F-20, F-11). Inside a FormField it takes the label, hint, error and
 * required wiring from the field; standalone (e.g. a toolbar search) it needs `label`.
 * The placeholder is an example only, never the label (F-20). Extra attributes such as
 * `autocomplete` or `maxlength` go to the <input>. `type="date"` is the native date input:
 * typing an ISO date works (F-20 AC6) and read-only shows "24 Oct 2026".
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    type?:
      | 'text'
      | 'email'
      | 'password'
      | 'search'
      | 'url'
      | 'number'
      | 'date'
      | 'datetime-local';
    placeholder?: string;
    /** Leading icon, e.g. "search". Decorative. */
    icon?: IconName;
    /** Accessible name when used outside a FormField. */
    label?: string;
    /** Accessible completion choices; authored values remain unrestricted. */
    options?: string[];
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    icon: undefined,
    label: undefined,
    options: undefined,
  },
);
const model = defineModel<string>({ default: '' });
const { controlAttrs, invalid, readonly } = useFieldControl(() => props.label);
const shownValue = computed(() => {
  if (!model.value) return model.value;
  if (props.type === 'password') return '••••••••';
  return props.type === 'date' ? formatDate(model.value) : model.value;
});

// Bound by hand so type="number" keeps a string model (v-model would cast it).
function onInput(event: Event): void {
  model.value = (event.target as HTMLInputElement).value;
}
</script>

<template>
  <FieldValue v-if="readonly" :value="shownValue" />
  <TextCompletion
    v-else-if="options"
    v-model="model"
    :options="options"
    :type="type"
    :placeholder="placeholder"
    :icon="icon"
    :label="label"
    :invalid="invalid"
    :control-attrs="{ ...$attrs, ...controlAttrs }"
  />
  <div v-else class="text-input">
    <Icon v-if="icon" :name="icon" class="text-input__icon" />
    <input
      v-bind="{ ...$attrs, ...controlAttrs }"
      class="text-input__control"
      :class="{
        'text-input__control--icon': icon,
        'text-input__control--invalid': invalid,
      }"
      :type="type"
      :value="model"
      :placeholder="placeholder"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.text-input {
  position: relative;
  min-width: 0;
}

.text-input__icon {
  position: absolute;
  top: calc(50% - var(--ds-size-icon-md) / 2);
  left: var(--ds-space-3);
  color: var(--ds-color-text-secondary);
  pointer-events: none;
}

.text-input__control {
  width: 100%;
  min-width: 0;
  height: var(--ds-size-control-md);
  margin: 0;
  padding: 0 var(--ds-space-3);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.text-input__control:hover {
  background: var(--ds-color-surface-base);
}

.text-input__control::placeholder {
  color: var(--ds-color-text-secondary);
  opacity: 1;
}

.text-input__control--icon {
  padding-left: calc(
    var(--ds-space-3) + var(--ds-size-icon-md) + var(--ds-space-2)
  );
}

.text-input__control--invalid {
  border-color: var(--ds-color-status-error-fg);
}
</style>
