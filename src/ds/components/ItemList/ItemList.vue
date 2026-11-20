<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

/**
 * A list of linked items with a meta line and an optional trailing badge: tasks, activity,
 * alerts and history all use it (P9). Each title is a real link, never a clickable row (F-09).
 * `time` shows a formatted time; `datetime` makes it machine-readable. `dense` is for narrow side
 * columns on overview pages: tighter rows, and the trailing badge sits beside the meta line under a
 * full-width title instead of wrapping onto a line of its own. `rowLink` stretches each title's
 * link over its whole row, so the row is one big click target; it stays one link (the title) for
 * keyboards and screen readers, and links or focusable items in the trailing slots sit above it.
 * An item's `code` (e.g. a control ID) leads its title in the code font. The `meta-trailing` slot
 * puts more at the end of the meta line, under the trailing slot: two lines, each with its own
 * end, which stack when the list is narrow.
 */
withDefaults(
  defineProps<{
    items: {
      id: string;
      title: string;
      code?: string;
      to?: RouteLocationRaw;
      meta?: string;
      time?: string;
      datetime?: string;
    }[];
    emptyText: string;
    dense?: boolean;
    rowLink?: boolean;
  }>(),
  { dense: false, rowLink: false },
);
</script>

<template>
  <ul
    v-if="items.length"
    class="item-list"
    :class="{
      'item-list--dense': dense,
      'item-list--row-link': rowLink,
      'item-list--two-line': $slots['meta-trailing'],
    }"
  >
    <li v-for="item in items" :key="item.id" class="item-list__item">
      <div class="item-list__main">
        <RouterLink
          v-if="item.to"
          :to="item.to"
          class="item-list__title item-list__title--link"
          ><code v-if="item.code" class="item-list__code">{{ item.code }}</code
          >{{ item.title }}</RouterLink
        >
        <span v-else class="item-list__title"
          ><code v-if="item.code" class="item-list__code">{{ item.code }}</code
          >{{ item.title }}</span
        >
        <span v-if="item.meta || item.time" class="item-list__meta">
          {{ item.meta }}<template v-if="item.meta && item.time"> · </template>
          <time v-if="item.time" :datetime="item.datetime">{{
            item.time
          }}</time>
        </span>
      </div>
      <div v-if="$slots['meta-trailing']" class="item-list__meta-trailing">
        <slot name="meta-trailing" :item="item" />
      </div>
      <div v-if="$slots.trailing" class="item-list__trailing">
        <slot name="trailing" :item="item" />
      </div>
    </li>
  </ul>
  <p v-else class="item-list__empty">{{ emptyText }}</p>
</template>

<style scoped>
.item-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-list__item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-2) var(--ds-space-4);
  padding: var(--ds-space-3) 0;
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.item-list--dense .item-list__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ds-space-1) var(--ds-space-3);
  padding: var(--ds-space-2) 0;
}

.item-list--dense .item-list__main {
  display: contents;
}

.item-list--dense .item-list__title {
  grid-column: 1 / -1;
}

.item-list__item:first-child {
  padding-top: 0;
}

.item-list__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.item-list__main {
  display: flex;
  flex: 1 1 var(--ds-width-column-sm);
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.item-list__title {
  font-weight: var(--ds-font-weight-semibold);
  overflow-wrap: anywhere;
}

.item-list__title--link {
  color: var(--ds-color-text-primary);
  text-decoration: underline;
  text-decoration-thickness: var(--ds-border-width);
  text-underline-offset: var(--ds-space-1);
}

.item-list__title--link:hover {
  color: var(--ds-color-text-accent);
}

.item-list__meta,
.item-list__empty {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.item-list--row-link .item-list__item {
  position: relative;
}

.item-list--row-link .item-list__item:hover {
  background: var(--ds-color-surface-hover);
}

.item-list--row-link .item-list__title--link::after {
  content: '';
  position: absolute;
  inset: 0;
}

/* Positioned after the title in the DOM, so they paint above its stretched link. */
.item-list--row-link
  :is(.item-list__trailing, .item-list__meta-trailing)
  :deep(:is(a, button, [tabindex])) {
  position: relative;
}

.item-list__trailing {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--ds-space-2);
}
.item-list__code {
  margin-right: var(--ds-space-2);
  font-family: var(--ds-font-code);
}

.item-list__meta-trailing {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  align-items: center;
  gap: var(--ds-space-1) var(--ds-space-3);
}

/* Two lines, each with its own end: stacked when narrow, side by side when there is room. */
.item-list--two-line {
  container-type: inline-size;
}

.item-list--two-line .item-list__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'title' 'meta' 'meta-trailing' 'trailing';
  gap: var(--ds-space-1) var(--ds-space-4);
}

.item-list--two-line .item-list__main {
  display: contents;
}

.item-list--two-line .item-list__title {
  grid-area: title;
  justify-self: start;
}

.item-list--two-line .item-list__meta {
  grid-area: meta;
}

.item-list--two-line .item-list__meta-trailing {
  grid-area: meta-trailing;
}

.item-list--two-line .item-list__trailing {
  grid-area: trailing;
  flex-wrap: wrap;
}

@container (min-width: 720px) {
  .item-list--two-line .item-list__item {
    grid-template-columns: minmax(0, 1fr) fit-content(50%);
    grid-template-areas:
      'title trailing'
      'meta meta-trailing';
  }

  .item-list--two-line :is(.item-list__trailing, .item-list__meta-trailing) {
    justify-content: flex-end;
  }
}
</style>
