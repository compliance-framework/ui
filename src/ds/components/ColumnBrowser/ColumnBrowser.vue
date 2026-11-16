<script setup lang="ts">
import { nextTick, ref } from 'vue';

/**
 * Drill-down columns (a "column browser"): each column lists the children of the item selected in
 * the column before it, side by side and scrolling sideways. Each column is a labelled region
 * with a heading; the `column` slot renders its contents (usually `ColumnBrowserItem`s). Call
 * `revealLast()` after opening a column to scroll it into view.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    columns: { key: string; title: string }[];
    /** The column headings' level, following the page's outline. */
    headingLevel?: 2 | 3 | 4;
  }>(),
  { headingLevel: 3 },
);
const scroller = ref<HTMLElement>();

defineExpose({
  async revealLast() {
    await nextTick();
    const el = scroller.value;
    el?.scrollTo?.({ left: el.scrollWidth, behavior: 'smooth' });
  },
});
</script>

<template>
  <div
    ref="scroller"
    class="column-browser"
    role="group"
    :aria-label="props.label"
    tabindex="0"
  >
    <section
      v-for="(column, index) in columns"
      :key="column.key"
      class="column-browser__column"
      :aria-labelledby="`${column.key}-heading`"
    >
      <component
        :is="`h${props.headingLevel}`"
        :id="`${column.key}-heading`"
        class="column-browser__title"
      >
        {{ column.title }}
      </component>
      <div class="column-browser__items">
        <slot name="column" :column="column" :index="index" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.column-browser {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-6);
  overflow-x: auto;
  padding: var(--ds-space-1) var(--ds-space-1) var(--ds-space-4);
}
.column-browser:focus-visible {
  outline: var(--ds-focus-width) solid var(--ds-color-border-focus);
  outline-offset: var(--ds-focus-offset);
}
.column-browser__column {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: var(--ds-space-3);
  width: min(100%, var(--ds-width-column-lg));
  padding: var(--ds-space-3);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-none);
  background: var(--ds-color-surface-sunken);
}
.column-browser__title {
  margin: 0;
  overflow: hidden;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  font-weight: var(--ds-font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.column-browser__items {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}
</style>
