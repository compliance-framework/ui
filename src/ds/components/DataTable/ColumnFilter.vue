<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue';
import Combobox from '../Combobox/Combobox.vue';
import Icon from '../Icon/Icon.vue';
import IconButton from '../IconButton/IconButton.vue';
import Tooltip from '../Tooltip/Tooltip.vue';

/**
 * A column title that filters the column's rows, for a DataTable `header-<key>` slot. The title is
 * a button that turns into a type-to-search Combobox; choosing shows the choice in its place as
 * `subject = payments-db`, with a clear button, so the filter is in view above what it narrows.
 * Escape, or leaving without choosing, restores the header. Options and searching are the
 * caller's, as for Combobox (`remote` and `search`); keep the chosen option among the options.
 * It filters the current view, unlike a FilterBar search, which is what a list saves.
 */
withDefaults(
  defineProps<{
    /** The column's title. */
    label: string;
    /** What the filter matches, in lower case, e.g. "subject". */
    name: string;
    options: { value: string; label: string }[];
    /** The chosen option's short name, shown in the header. */
    valueLabel?: string;
    remote?: boolean;
    loading?: boolean;
  }>(),
  { valueLabel: undefined, remote: false, loading: false },
);
const model = defineModel<string>({ default: '' });
const emit = defineEmits<{ search: [text: string] }>();

const root = useTemplateRef<HTMLElement>('root');
const editing = ref(false);
const open = ref(false);

async function edit(): Promise<void> {
  editing.value = true;
  await nextTick();
  root.value?.querySelector('input')?.focus();
  open.value = true;
}

// Closing the list ends editing, whether by choosing, Escape or leaving the field. Focus returns
// to the header only if it was still in the field (not when the user clicked elsewhere).
watch(open, async (isOpen) => {
  if (isOpen || !editing.value) return;
  const hadFocus = root.value?.contains(document.activeElement) ?? false;
  editing.value = false;
  await nextTick();
  if (hadFocus) root.value?.querySelector('button')?.focus();
});
</script>

<template>
  <span ref="root" class="column-filter">
    <span v-if="editing" class="column-filter__field">
      <Combobox
        v-model="model"
        v-model:open="open"
        :options="options"
        :remote="remote"
        :loading="loading"
        :label="`Filter by ${name}`"
        :placeholder="`Type a ${name}`"
        :empty-text="`No ${name} matches.`"
        @search="(text) => emit('search', text)"
      />
    </span>
    <template v-else-if="model">
      <Tooltip :text="`Filtered by ${name}: ${valueLabel ?? model}`">
        <button type="button" class="column-filter__value" @click="edit">
          <Icon name="filter" size="sm" />
          <span class="column-filter__text"
            >{{ name }} = {{ valueLabel ?? model }}</span
          >
          <span class="visually-hidden">, change filter</span>
        </button>
      </Tooltip>
      <IconButton
        icon="close"
        size="sm"
        :label="`Clear ${name} filter`"
        @click="model = ''"
      />
    </template>
    <Tooltip v-else :text="`Filter by ${name}`">
      <button type="button" class="column-filter__title" @click="edit">
        {{ label }}
        <Icon name="filter" size="sm" />
        <span class="visually-hidden">, filter by {{ name }}</span>
      </button>
    </Tooltip>
  </span>
</template>

<style scoped>
.column-filter {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  max-width: 100%;
}

.column-filter__field {
  min-width: var(--ds-width-column-md);
  font-weight: var(--ds-font-weight-regular);
  letter-spacing: normal;
  text-transform: none;
}

.column-filter__title,
.column-filter__value {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  min-width: 0;
  min-height: var(--ds-size-target-min);
  margin: calc(var(--ds-space-1) * -1) calc(var(--ds-space-2) * -1);
  padding: var(--ds-space-1) var(--ds-space-2);
  border: 0;
  border-radius: var(--ds-radius-none);
  background: transparent;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: pointer;
}

.column-filter__title:hover,
.column-filter__value:hover {
  background: var(--ds-color-surface-hover);
  color: var(--ds-color-text-primary);
}

/* The choice reads like a Tag with `code`: what is filtered, as the search syntax shows it. */
.column-filter__value {
  margin-inline-end: 0;
  color: var(--ds-color-text-primary);
}

.column-filter__text {
  max-width: var(--ds-width-column-md);
  overflow: hidden;
  padding: 0 var(--ds-space-2);
  background: var(--ds-color-status-neutral-bg);
  font-family: var(--ds-font-code);
  font-weight: var(--ds-font-weight-regular);
  letter-spacing: normal;
  text-overflow: ellipsis;
  text-transform: none;
}
</style>
