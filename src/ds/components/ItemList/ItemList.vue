<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

/**
 * A list of linked items with a meta line and an optional trailing badge: tasks, activity,
 * alerts and history all use it (P9). Each title is a real link, never a clickable row (F-09).
 * `time` shows a formatted time; `datetime` makes it machine-readable. `dense` is for narrow side
 * columns on overview pages: tighter rows, and the trailing badge sits beside the meta line under a
 * full-width title instead of wrapping onto a line of its own.
 */
withDefaults(
  defineProps<{
    items: {
      id: string;
      title: string;
      to?: RouteLocationRaw;
      meta?: string;
      time?: string;
      datetime?: string;
    }[];
    emptyText: string;
    dense?: boolean;
  }>(),
  { dense: false },
);
</script>

<template>
  <ul
    v-if="items.length"
    class="item-list"
    :class="{ 'item-list--dense': dense }"
  >
    <li v-for="item in items" :key="item.id" class="item-list__item">
      <div class="item-list__main">
        <RouterLink
          v-if="item.to"
          :to="item.to"
          class="item-list__title item-list__title--link"
          >{{ item.title }}</RouterLink
        >
        <span v-else class="item-list__title">{{ item.title }}</span>
        <span v-if="item.meta || item.time" class="item-list__meta">
          {{ item.meta }}<template v-if="item.meta && item.time"> · </template>
          <time v-if="item.time" :datetime="item.datetime">{{
            item.time
          }}</time>
        </span>
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

.item-list__trailing {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: var(--ds-space-2);
}
</style>
