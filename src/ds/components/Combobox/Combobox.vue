<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui';
import FieldValue from '../FormField/FieldValue.vue';
import { useFieldControl } from '../FormField/field';
import Icon from '../Icon/Icon.vue';

/**
 * Choose one option from a long list by typing to filter it, e.g. a control from a catalog. The
 * input shows the chosen option's label; typing narrows the list (label or value, ignoring case),
 * and leaving the field without choosing restores the chosen label, so only listed values can be
 * chosen. Wired by its FormField like TextInput. For a short fixed list, use Select.
 *
 * When the options come from a server search, set `remote` and listen to `search`: it fires with
 * the typed text (and with '' on opening), the field stops filtering, and `options` should be the
 * results. Keep the chosen option among them so its label shows. Option values can't be empty:
 * an empty model means nothing is chosen, and `clearable` adds a button that returns to it.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    options: { value: string; label: string }[];
    placeholder?: string;
    /** Accessible name when used outside a FormField. */
    label?: string;
    /** Shown while the options load. */
    loading?: boolean;
    emptyText?: string;
    /** The caller searches (see above); `options` are the matches. */
    remote?: boolean;
    /** Show a clear button once an option is chosen, e.g. for an optional filter. */
    clearable?: boolean;
  }>(),
  {
    placeholder: undefined,
    label: undefined,
    loading: false,
    emptyText: 'Nothing matches.',
    remote: false,
    clearable: false,
  },
);
const model = defineModel<string>({ default: '' });
const emit = defineEmits<{ search: [text: string] }>();
const { controlAttrs, invalid, readonly } = useFieldControl(() => props.label);

/** At most this many matches render; typing narrows the rest. */
const LIMIT = 100;

/** Whether the list is open; bind it to open the list from outside, e.g. when the field appears. */
const open = defineModel<boolean>('open', { default: false });
const search = ref('');
/** True once the user has typed since opening, so a fresh open shows every option. */
const typed = ref(false);
const input = ref<InstanceType<typeof ComboboxInput>>();

const labelOf = (value: unknown) =>
  props.options.find((o) => o.value === value)?.label ?? '';
const matches = computed(() => {
  if (props.remote) return props.options;
  const needle = typed.value ? search.value.trim().toLowerCase() : '';
  return needle
    ? props.options.filter(
        (o) =>
          o.label.toLowerCase().includes(needle) ||
          o.value.toLowerCase().includes(needle),
      )
    : props.options;
});
const shown = computed(() => matches.value.slice(0, LIMIT));

watch(open, (isOpen) => {
  if (!isOpen) return;
  typed.value = false;
  if (props.remote) emit('search', '');
});

function onInput(): void {
  typed.value = true;
  if (props.remote) emit('search', search.value);
}

// Menus portal next to their landmark, so axe's region rule and dialog focus traps hold.
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

function choose(value: unknown): void {
  if (typeof value !== 'string') return;
  model.value = value;
  typed.value = false;
}
</script>

<template>
  <FieldValue v-if="readonly" :value="labelOf(model)" />
  <ComboboxRoot
    v-else
    v-model:open="open"
    :model-value="model"
    ignore-filter
    open-on-click
    reset-search-term-on-blur
    class="combobox"
    @update:model-value="choose"
  >
    <ComboboxAnchor class="combobox__anchor">
      <ComboboxInput
        ref="input"
        v-model="search"
        v-bind="{ ...$attrs, ...controlAttrs }"
        :display-value="labelOf"
        class="combobox__input"
        :class="{
          'combobox__input--invalid': invalid,
          'combobox__input--clearable': clearable && model,
        }"
        :placeholder="loading ? 'Loading…' : placeholder"
        @input="onInput"
      />
      <button
        v-if="clearable && model"
        type="button"
        class="combobox__clear"
        :aria-label="label ? `Clear ${label}` : 'Clear'"
        @click="model = ''"
      >
        <Icon name="close" />
      </button>
      <ComboboxTrigger
        class="combobox__trigger"
        tabindex="-1"
        aria-hidden="true"
      >
        <Icon name="expand" />
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal :to="portalTarget">
      <ComboboxContent
        position="popper"
        align="start"
        class="combobox__choices"
        :aria-label="label ? `${label} choices` : 'Choices'"
      >
        <ComboboxViewport data-scroll>
          <ComboboxEmpty class="combobox__note">{{
            loading ? 'Loading…' : emptyText
          }}</ComboboxEmpty>
          <ComboboxItem
            v-for="option in shown"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            class="combobox__choice"
            >{{ option.label }}</ComboboxItem
          >
          <p v-if="matches.length > shown.length" class="combobox__note">
            Showing {{ shown.length }} of {{ matches.length }}. Type to narrow
            the list.
          </p>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped>
.combobox,
.combobox__anchor {
  position: relative;
  min-width: 0;
}

.combobox__input {
  width: 100%;
  min-width: 0;
  height: var(--ds-size-control-md);
  margin: 0;
  padding: 0
    calc(var(--ds-space-3) + var(--ds-size-icon-md) + var(--ds-space-2)) 0
    var(--ds-space-3);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  color: var(--ds-color-text-primary);
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.combobox__input:hover {
  background: var(--ds-color-surface-base);
}

.combobox__input::placeholder {
  color: var(--ds-color-text-secondary);
  opacity: 1;
}

.combobox__input--invalid {
  border-color: var(--ds-color-status-error-fg);
}

.combobox__input--clearable {
  padding-right: calc(
    (var(--ds-size-icon-md) + var(--ds-space-3) * 2) * 2 - var(--ds-space-3)
  );
}

.combobox__trigger,
.combobox__clear {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--ds-size-icon-md) + var(--ds-space-3) * 2);
  height: 100%;
  padding: 0;
  background: none;
  border: 0;
  color: var(--ds-color-text-secondary);
  cursor: pointer;
}

.combobox__clear {
  right: calc(var(--ds-size-icon-md) + var(--ds-space-3));
  width: calc(var(--ds-size-icon-md) + var(--ds-space-2) * 2);
}

.combobox__clear:hover {
  color: var(--ds-color-text-primary);
}

.combobox__choice {
  min-height: var(--ds-size-control-md);
  padding: var(--ds-space-2) var(--ds-space-3);
  color: var(--ds-color-text-primary);
  overflow-wrap: anywhere;
  cursor: pointer;
}

.combobox__choice[data-highlighted] {
  background: var(--ds-color-surface-hover);
}

.combobox__choice[data-state='checked'] {
  font-weight: var(--ds-font-weight-semibold);
}

.combobox__note {
  margin: 0;
  padding: var(--ds-space-2) var(--ds-space-3);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}
</style>

<!-- Unscoped: the list is a popper wrapper's inner element, so it doesn't get the scope attribute. -->
<style>
.combobox__choices {
  z-index: var(--ds-z-overlay);
  width: var(--reka-combobox-trigger-width);
  max-width: var(--reka-combobox-content-available-width);
  max-height: min(
    var(--reka-combobox-content-available-height),
    calc(var(--ds-size-control-md) * 10)
  );
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--ds-space-1) 0;
  background: var(--ds-color-surface-overlay);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  box-shadow: var(--ds-shadow-raised);
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}
</style>
