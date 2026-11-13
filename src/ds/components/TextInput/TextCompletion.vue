<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
} from 'reka-ui';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';

/** Free text with accessible completion choices; FormField wiring stays on the native input. */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    options: string[];
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
    icon?: IconName;
    label?: string;
    invalid?: boolean;
    controlAttrs?: Record<string, unknown>;
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    icon: undefined,
    label: undefined,
    invalid: false,
    controlAttrs: () => ({}),
  },
);
const model = defineModel<string>({ default: '' });
const open = ref(false);
const highlighted = ref<string>();
const highlightedElement = ref<HTMLElement>();
const keyboardChoice = ref(false);
const input = ref<InstanceType<typeof ComboboxInput>>();
const listbox = ref<HTMLElement>();
const disabled = computed(() => {
  const value = props.controlAttrs.disabled;
  return value !== undefined && value !== null && value !== false;
});
const choices = computed(() => {
  const query = model.value.toLowerCase();
  return [...new Set(props.options)].filter(
    (option) => option !== '' && option.toLowerCase().includes(query),
  );
});
const ariaLabel = computed(() => {
  const value = props.controlAttrs['aria-label'];
  return typeof value === 'string' ? value : props.label;
});
const ariaInvalid = computed(() => {
  const value = props.controlAttrs['aria-invalid'];
  return props.invalid || value === true || value === 'true'
    ? 'true'
    : undefined;
});
const activeDescendant = computed(() =>
  open.value &&
  highlightedElement.value?.isConnected &&
  choices.value.includes(highlighted.value ?? '')
    ? highlightedElement.value.id
    : undefined,
);
const portalTarget = computed(() => {
  if (!open.value) return undefined;
  const element = input.value?.$el;
  const landmark =
    element instanceof HTMLElement
      ? element.closest<HTMLElement>(
          '[role="dialog"], [role="alertdialog"], main',
        )
      : undefined;
  if (landmark?.matches('main'))
    return (
      landmark.querySelector<HTMLElement>(':scope > [data-tooltip-portal]') ??
      document.body
    );
  return landmark ?? document.body;
});
watch(disabled, (value) => {
  if (value) open.value = false;
});
watch(open, (value) => {
  if (!value) {
    highlighted.value = undefined;
    highlightedElement.value = undefined;
    resetChoice();
  }
});
watch(model, resetChoice, { flush: 'sync' });
watch(() => props.options, resetChoice, { deep: true, flush: 'sync' });
function resetChoice(): void {
  keyboardChoice.value = false;
}
function navigate(event: KeyboardEvent): void {
  if (
    !event.isComposing &&
    (event.key === 'ArrowDown' || event.key === 'ArrowUp')
  )
    keyboardChoice.value = true;
}
function select(value: unknown): void {
  if (disabled.value || typeof value !== 'string') return;
  model.value = value;
  resetChoice();
  open.value = false;
}
function highlight(
  item: { value: unknown; ref: HTMLElement } | undefined,
): void {
  highlighted.value = typeof item?.value === 'string' ? item.value : undefined;
  highlightedElement.value = item?.ref;
}
function tab(event: KeyboardEvent): void {
  if (
    !event.shiftKey &&
    !event.isComposing &&
    keyboardChoice.value &&
    open.value &&
    highlighted.value !== undefined &&
    choices.value.includes(highlighted.value)
  )
    select(highlighted.value);
  resetChoice();
  open.value = false;
}
function escape(event: KeyboardEvent): void {
  event.preventDefault();
  resetChoice();
  open.value = false;
}
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    :model-value="model"
    :disabled="disabled"
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="false"
    :reset-model-value-on-clear="false"
    open-on-focus
    open-on-click
    ignore-filter
    class="text-completion"
    @update:model-value="select"
    @highlight="highlight"
  >
    <ComboboxAnchor class="text-completion__anchor">
      <Icon v-if="icon" :name="icon" class="text-completion__icon" />
      <ComboboxInput
        ref="input"
        v-model="model"
        v-bind="{ ...$attrs, ...controlAttrs }"
        class="text-completion__input"
        :class="{
          'text-completion__input--icon': icon,
          'text-completion__input--invalid': invalid,
        }"
        :type="type"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :aria-invalid="ariaInvalid"
        :aria-activedescendant="activeDescendant"
        :aria-controls="open ? listbox?.id : undefined"
        @keydown.capture="navigate"
        @focus="resetChoice"
        @input="resetChoice"
        @compositionstart="resetChoice"
        @keydown.tab="tab"
      />
    </ComboboxAnchor>
    <ComboboxPortal :to="portalTarget">
      <ComboboxContent
        as-child
        position="popper"
        align="start"
        hide-when-empty
        @escape-key-down="escape"
      >
        <div
          ref="listbox"
          class="text-completion__choices"
          :aria-label="label ? `${label} suggestions` : 'Completion choices'"
          data-scroll
        >
          <ComboboxItem
            v-for="choice in choices"
            :key="choice"
            :value="choice"
            :text-value="choice"
            class="text-completion__choice"
            >{{ choice }}</ComboboxItem
          >
        </div>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped>
.text-completion,
.text-completion__anchor {
  position: relative;
  min-width: 0;
}

.text-completion__icon {
  position: absolute;
  top: calc(50% - var(--size-icon-md) / 2);
  left: var(--space-3);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.text-completion__input {
  width: 100%;
  min-width: 0;
  height: var(--size-control-md);
  margin: 0;
  padding: 0 var(--space-3);
  background: var(--color-surface-sunken);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  font-size: var(--font-size-body);
  line-height: var(--leading-snug);
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.text-completion__input:hover {
  background: var(--color-surface-base);
}

.text-completion__input::placeholder {
  color: var(--color-text-secondary);
  opacity: 1;
}

.text-completion__input--icon {
  padding-left: calc(var(--space-3) + var(--size-icon-md) + var(--space-2));
}

.text-completion__input--invalid {
  border-color: var(--color-status-error-fg);
}

.text-completion__choices {
  z-index: var(--z-overlay);
  width: var(--reka-combobox-trigger-width);
  max-width: var(--reka-combobox-content-available-width);
  max-height: var(--reka-combobox-content-available-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-1) 0;
  background: var(--color-surface-overlay);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-raised);
  font-family: var(--font-ui);
  font-size: var(--font-size-body);
  line-height: var(--leading-body);
}

.text-completion__choice {
  min-height: var(--size-control-md);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
  cursor: pointer;
}

.text-completion__choice[data-highlighted] {
  background: var(--color-surface-hover);
}

.text-completion__choice[data-state='checked'] {
  font-weight: var(--font-weight-semibold);
}
</style>
