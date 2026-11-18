<script setup lang="ts">
import { useId, useTemplateRef, watch } from 'vue';
import Button from '../Button/Button.vue';
import FormField from '../FormField/FormField.vue';
import IconButton from '../IconButton/IconButton.vue';
import TextInput from '../TextInput/TextInput.vue';

/**
 * The filter bar of a list (04 §4.2; F-14 AC2, F-22). A search field that applies on Enter or
 * the Search button, never per keystroke, with its problem shown at the field in plain language
 * (F-13 AC3). The default slot holds the other filter fields; everything wraps on the narrowest
 * (320 pixel) screens. The `search-actions` slot adds buttons after Search that act on the search,
 * e.g. "Save as filter". Active filters show as chips that name what they filter ("Status: Not
 * satisfied"), each with its own remove button, plus "Clear filters". `summary` is the result
 * count, announced politely when it changes (4.1.3). After a chip goes, focus moves to the next
 * chip, or to the search field.
 */
const props = withDefaults(
  defineProps<{
    /** Accessible name of the region, e.g. "Filter evidence". */
    label: string;
    /** Omit for a bar of filters with no text search. */
    searchLabel?: string;
    searchHint?: string;
    searchError?: string;
    searchPlaceholder?: string;
    chips?: { label: string }[];
    summary?: string;
  }>(),
  {
    searchLabel: undefined,
    searchHint: undefined,
    searchError: undefined,
    searchPlaceholder: undefined,
    chips: () => [],
    summary: '',
  },
);
const emit = defineEmits<{ search: []; remove: [index: number]; clear: [] }>();
const query = defineModel<string>('query', { default: '' });

const activeId = useId();
const root = useTemplateRef<HTMLElement>('root');

// The parent may update the chips asynchronously (e.g. after a route change), so focus moves once
// the chips have changed, not on the next tick.
let pendingFocus: number | undefined;
watch(
  () => props.chips,
  () => {
    if (pendingFocus === undefined) return;
    const buttons = root.value?.querySelectorAll<HTMLElement>(
      '.filter-bar__chip button',
    );
    const next = buttons?.length
      ? buttons[Math.min(pendingFocus, buttons.length - 1)]
      : undefined;
    (next ?? root.value?.querySelector<HTMLElement>('input'))?.focus();
    pendingFocus = undefined;
  },
  { flush: 'post' },
);

function remove(index: number): void {
  pendingFocus = index;
  emit('remove', index);
}

function clear(): void {
  pendingFocus = 0;
  emit('clear');
}
</script>

<template>
  <section ref="root" class="filter-bar" :aria-label="label">
    <div class="filter-bar__fields">
      <form
        v-if="searchLabel"
        class="filter-bar__search"
        role="search"
        :aria-label="searchLabel"
        @submit.prevent="emit('search')"
      >
        <FormField :label="searchLabel" :hint="searchHint" :error="searchError">
          <div class="filter-bar__search-row">
            <TextInput
              v-model="query"
              type="search"
              icon="search"
              :placeholder="searchPlaceholder"
            />
            <Button type="submit">Search</Button>
            <slot name="search-actions" />
          </div>
        </FormField>
      </form>
      <slot />
    </div>
    <div v-if="chips.length" class="filter-bar__active">
      <span :id="activeId" class="filter-bar__active-label"
        >Active filters</span
      >
      <ul class="filter-bar__chips" :aria-labelledby="activeId">
        <li
          v-for="(chip, index) in chips"
          :key="chip.label"
          class="filter-bar__chip"
        >
          <span class="filter-bar__chip-label">{{ chip.label }}</span>
          <IconButton
            icon="close"
            size="sm"
            :label="`Remove filter ${chip.label}`"
            @click="remove(index)"
          />
        </li>
      </ul>
      <Button variant="tertiary" size="sm" @click="clear">Clear filters</Button>
    </div>
    <p class="filter-bar__summary" role="status">{{ summary }}</p>
  </section>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
  min-width: 0;
  padding: var(--ds-space-4);
  background: var(--ds-color-surface-raised);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.filter-bar__fields {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--ds-space-4) var(--ds-space-6);
}

.filter-bar__search {
  flex: 2 1 var(--ds-width-column-lg);
  min-width: 0;
}

.filter-bar__fields > :slotted(*) {
  flex: 1 1 var(--ds-width-column-sm);
  min-width: 0;
}

.filter-bar__search-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}

.filter-bar__search-row > :first-child {
  flex: 1 1 var(--ds-width-column-sm);
}

.filter-bar__active {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2) var(--ds-space-3);
  padding-top: var(--ds-space-4);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.filter-bar__active-label {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

.filter-bar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.filter-bar__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  max-width: 100%;
  padding-inline-start: var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  background: var(--ds-color-surface-selected);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.filter-bar__chip-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.filter-bar__summary {
  margin: 0;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.filter-bar__summary:empty {
  display: none;
}
</style>
