<script setup lang="ts">
import Tooltip from '../Tooltip/Tooltip.vue';

export interface OutlineItem {
  id: string;
  /** The item's own label, e.g. "a." or "(1)"; the list doesn't number items itself. */
  label: string;
  text: string;
  /** Supplementary text shown on hover and focus of the label, e.g. the item's ID. */
  hint?: string;
  items?: OutlineItem[];
}

/**
 * Text broken into labelled items that may hold items of their own, e.g. a control's statement:
 * "a.", "b.", with "1.", "2." under them. Each label hangs beside its text, nested items indent
 * under their parent's text, and top-level items are divided by a rule, so each reads as one
 * piece. A label with a hint is focusable, so the hint is reachable by keyboard.
 */
withDefaults(defineProps<{ items: OutlineItem[]; nested?: boolean }>(), {
  nested: false,
});
</script>

<template>
  <ol class="outline" :class="{ 'outline--nested': nested }">
    <li v-for="item in items" :key="item.id" class="outline__item">
      <Tooltip v-if="item.hint" :text="item.hint">
        <span class="outline__label" tabindex="0">{{ item.label }}</span>
      </Tooltip>
      <span v-else class="outline__label">{{ item.label }}</span>
      <div class="outline__body">
        <span v-if="item.text">{{ item.text }}</span>
        <Outline v-if="item.items?.length" :items="item.items" nested />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.outline {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-prose);
  line-height: var(--ds-leading-prose);
}

.outline__item {
  display: grid;
  grid-template-columns: minmax(var(--ds-space-6), auto) minmax(0, 1fr);
  gap: var(--ds-space-2);
}

.outline:not(.outline--nested) > .outline__item {
  padding: var(--ds-space-3) 0;
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.outline:not(.outline--nested) > .outline__item:last-child {
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.outline--nested {
  gap: var(--ds-space-1);
  margin-top: var(--ds-space-1);
}

.outline__label {
  align-self: start;
  color: var(--ds-color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.outline__label[tabindex] {
  cursor: help;
}

.outline__body {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
