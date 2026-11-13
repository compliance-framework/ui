<script setup lang="ts" generic="T">
import { computed, useId } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';
import { useScrollable } from '../ScrollArea/useScrollable';
import TextLink from '../TextLink/TextLink.vue';
import type { DataTableColumn, DataTableSort } from './types';

/**
 * An accessible data table (F-18, F-11). It scrolls horizontally inside its own labelled,
 * focusable region, never the page, and is never clipped (F-18 AC1, AC4). Headers are
 * `th scope="col"`, the first cell of each row is its row header, and sortable headers are buttons
 * with `aria-sort` on the th. Sorting is the parent's job: the component only emits v-model:sort.
 * `rowLink` makes the first cell a link to the record instead of a clickable row (F-9 AC4).
 * The `actions` slot fills a final column; name row actions with the row ("Actions for risk …").
 */
const props = withDefaults(
  defineProps<{
    caption: string;
    captionHidden?: boolean;
    columns: DataTableColumn[];
    rows: T[];
    rowKey: (row: T) => string;
    rowLink?: (row: T) => RouteLocationRaw;
    expandedKeys?: string[];
  }>(),
  { captionHidden: false, rowLink: undefined, expandedKeys: () => [] },
);
const sort = defineModel<DataTableSort | null>('sort', { default: null });
const slots = defineSlots<{
  [name: `cell-${string}`]: (props: { row: T }) => unknown;
  actions?: (props: { row: T }) => unknown;
  'row-expanded'?: (props: { row: T }) => unknown;
}>();

const captionId = useId();
// Only a table too wide for its space scrolls (sideways), and only then is it a tab stop.
const { scrollable } = useScrollable('region', 'horizontal');
const firstKey = computed(() => props.columns[0]?.key);

function ariaSort(
  column: DataTableColumn,
): DataTableSort['direction'] | undefined {
  return column.sortable && sort.value?.key === column.key
    ? sort.value.direction
    : undefined;
}

function sortIcon(
  column: DataTableColumn,
): 'sortAscending' | 'sortDescending' | 'sortable' {
  const direction = ariaSort(column);
  return direction === 'ascending'
    ? 'sortAscending'
    : direction === 'descending'
      ? 'sortDescending'
      : 'sortable';
}

function toggleSort(column: DataTableColumn): void {
  const direction =
    sort.value?.key === column.key
      ? sort.value.direction === 'ascending'
        ? 'descending'
        : 'ascending'
      : (column.initialDirection ?? 'ascending');
  sort.value = { key: column.key, direction };
}

function cellText(row: T, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  return value === undefined || value === null ? '' : String(value);
}

function cellClasses(column: DataTableColumn): Record<string, boolean> {
  return {
    'data-table__cell--end': column.align === 'end',
    'data-table__cell--nowrap': Boolean(column.nowrap),
    [`data-table__cell--min-${column.minWidth}`]: Boolean(column.minWidth),
  };
}
</script>

<template>
  <div class="data-table">
    <p
      :id="captionId"
      class="data-table__caption"
      :class="{ 'visually-hidden': captionHidden }"
    >
      {{ caption }}
    </p>
    <div
      ref="region"
      class="data-table__region"
      role="region"
      :aria-labelledby="captionId"
      :tabindex="scrollable ? 0 : undefined"
      :data-scroll="scrollable ? '' : undefined"
    >
      <table class="data-table__table" :aria-labelledby="captionId">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="cellClasses(column)"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="data-table__sort"
                @click="toggleSort(column)"
              >
                <span>{{ column.label }}</span>
                <Icon :name="sortIcon(column)" size="sm" />
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
            <th v-if="slots.actions" scope="col" class="data-table__actions">
              <span class="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="rowKey(row)">
            <tr>
              <component
                :is="column.key === firstKey ? 'th' : 'td'"
                v-for="column in columns"
                :key="column.key"
                :scope="column.key === firstKey ? 'row' : undefined"
                :class="cellClasses(column)"
              >
                <TextLink
                  v-if="rowLink && column.key === firstKey"
                  :to="rowLink(row)"
                >
                  <slot :name="`cell-${column.key}`" :row="row">{{
                    cellText(row, column.key)
                  }}</slot>
                </TextLink>
                <slot v-else :name="`cell-${column.key}`" :row="row">{{
                  cellText(row, column.key)
                }}</slot>
              </component>
              <td v-if="slots.actions" class="data-table__actions">
                <slot name="actions" :row="row" />
              </td>
            </tr>
            <tr
              v-if="slots['row-expanded'] && expandedKeys.includes(rowKey(row))"
            >
              <td :colspan="columns.length + (slots.actions ? 1 : 0)">
                <slot name="row-expanded" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.data-table {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  min-width: 0;
}

.data-table__caption {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

/* The only horizontal scroll allowed (F-18 AC1). The max height lets the header stick while the
   region scrolls vertically; overflow is never hidden (F-18 AC4). */
.data-table__region {
  /* Never a vertical scroller inside the page (scroll model): it grows with its rows and only
     scrolls sideways when it doesn't fit. */
  max-width: 100%;
  overflow-x: auto;
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  background: var(--ds-color-surface-base);
}

.data-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
}

th,
td {
  padding: var(--ds-space-2) var(--ds-space-3);
  text-align: start;
  vertical-align: middle;
  overflow-wrap: normal;
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

tbody th {
  font-weight: var(--ds-font-weight-regular);
}

thead th {
  background: var(--ds-color-surface-sunken);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom-color: var(--ds-color-border-strong);
}

tbody tr:last-child > * {
  border-bottom: 0;
}

tbody tr:hover > * {
  background: var(--ds-color-surface-hover);
}

.data-table__cell--end {
  text-align: end;
}

.data-table__cell--nowrap {
  white-space: nowrap;
}

.data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
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

.data-table__sort:hover {
  background: var(--ds-color-surface-hover);
  color: var(--ds-color-text-primary);
}

th[aria-sort] .data-table__sort {
  color: var(--ds-color-text-primary);
}

.data-table__actions {
  width: 0;
  padding-block: 0;
  text-align: end;
  white-space: nowrap;
}
.data-table__cell--min-sm {
  min-width: var(--ds-width-column-sm);
}

.data-table__cell--min-md {
  min-width: var(--ds-width-column-md);
}
</style>
