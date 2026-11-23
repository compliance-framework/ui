<script setup lang="ts">
/**
 * Key facts and details as a `<dl>`, in one style everywhere (F-30, P9). An empty value reads
 * "Not set" rather than a dash or nothing (P1). A `value-<key>` slot renders rich values, such as
 * a status badge or a link.
 */
withDefaults(
  defineProps<{
    items: { key: string; label: string; value?: string | number | null }[];
    /**
     * `columns` flows pairs into as many columns as fit; `stacked` is one per row; `inline` runs the
     * pairs along one wrapping line, for key facts under a page title; `aligned` is one pair per
     * row in a compact table, terms in one column and values lined up in the next, for pairs inside
     * a list row (e.g. each component and its statuses).
     */
    layout?: 'columns' | 'stacked' | 'inline' | 'aligned';
  }>(),
  { layout: 'columns' },
);
</script>

<template>
  <dl class="description-list" :class="`description-list--${layout}`">
    <div v-for="item in items" :key="item.key" class="description-list__item">
      <dt class="description-list__term">{{ item.label }}</dt>
      <dd class="description-list__value">
        <slot :name="`value-${item.key}`">
          <template
            v-if="
              item.value !== undefined &&
              item.value !== null &&
              item.value !== ''
            "
            >{{ item.value }}</template
          >
          <span v-else class="description-list__empty">Not set</span>
        </slot>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.description-list {
  display: grid;
  gap: var(--ds-space-4) var(--ds-space-6);
  margin: 0;
}

.description-list--columns {
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, var(--ds-width-column-sm)), 1fr)
  );
}

.description-list--inline {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1) var(--ds-space-6);
}

.description-list--inline .description-list__item {
  flex-direction: row;
  align-items: baseline;
  gap: var(--ds-space-2);
}

.description-list--aligned {
  grid-template-columns: fit-content(50%) minmax(0, 1fr);
  align-items: center;
  gap: var(--ds-space-1) var(--ds-space-3);
}

.description-list--aligned .description-list__item {
  display: contents;
}

/* In a row, a term is a name, not a heading: in the row's small type, not capitals. */
.description-list--aligned .description-list__term {
  font-size: var(--ds-font-size-caption);
  font-weight: var(--ds-font-weight-regular);
  letter-spacing: normal;
  text-transform: none;
}

.description-list__item {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.description-list__term {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
  text-transform: uppercase;
}

.description-list__value {
  margin: 0;
  overflow-wrap: anywhere;
}

.description-list__empty {
  color: var(--ds-color-text-secondary);
}
</style>
