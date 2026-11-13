<script setup lang="ts">
import FieldValue from '../FormField/FieldValue.vue';
import { useFieldControl } from '../FormField/field';

/**
 * Multi-line text entry (F-20, F-11), wired by its FormField like TextInput (or `label` when
 * standalone). Resizes vertically only, so it never overflows a narrow screen. Extra attributes such as
 * `maxlength` go to the <textarea>. Auto-grow fits the content without an inner vertical scroller.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    rows?: number;
    placeholder?: string;
    label?: string;
    autoGrow?: boolean;
  }>(),
  {
    rows: 4,
    placeholder: undefined,
    label: undefined,
    autoGrow: false,
  },
);
const model = defineModel<string>({ default: '' });
const { controlAttrs, invalid, readonly } = useFieldControl(() => props.label);
</script>

<template>
  <FieldValue v-if="readonly" :value="model" />
  <textarea
    v-else
    v-model="model"
    v-bind="{ ...$attrs, ...controlAttrs }"
    class="textarea"
    :class="{ 'textarea--invalid': invalid, 'textarea--auto-grow': autoGrow }"
    :rows="rows"
    :placeholder="placeholder"
  />
</template>

<style scoped>
.textarea {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: var(--ds-size-control-md);
  margin: 0;
  padding: var(--ds-space-2) var(--ds-space-3);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  color: var(--ds-color-text-primary);
  /* People write long-form prose here, so it reads as it will be shown (D-23). */
  font-family: var(--ds-font-prose);
  font-size: var(--ds-font-size-prose);
  line-height: var(--ds-leading-prose);
  resize: vertical;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.textarea:hover {
  background: var(--ds-color-surface-base);
}

.textarea::placeholder {
  color: var(--ds-color-text-secondary);
  opacity: 1;
}

.textarea--invalid {
  border-color: var(--ds-color-status-error-fg);
}

@supports (field-sizing: content) {
  .textarea--auto-grow {
    field-sizing: content;
    overflow-y: hidden;
    resize: none;
  }
}
</style>
