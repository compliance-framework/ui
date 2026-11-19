<script setup lang="ts">
/**
 * The column labels for a list of LinkedColumns rows, shown once above them while the columns sit
 * side by side. When they stack, each box shows its own label instead and this is hidden. Hidden
 * from assistive technology: each box already carries its label.
 */
defineProps<{ columns: { key: string; label: string }[] }>();
</script>

<template>
  <div
    class="linked-columns-header"
    :class="`linked-columns-header--${columns.length}`"
    aria-hidden="true"
  >
    <template v-for="(column, index) in columns" :key="column.key">
      <span v-if="index > 0" />
      <span class="linked-columns-header__label">{{ column.label }}</span>
    </template>
  </div>
</template>

<style scoped>
.linked-columns-header {
  display: none;
}

.linked-columns-header__label {
  padding-inline: var(--ds-space-4);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

/* The same grid as LinkedColumns, so each label sits over its box; the arrow columns are the
   width of an icon. */
@container (min-width: 840px) {
  .linked-columns-header {
    display: grid;
    column-gap: var(--ds-space-1);
  }

  .linked-columns-header--2 {
    grid-template-columns: minmax(0, 1fr) var(--ds-size-icon-md) minmax(0, 1fr);
  }

  .linked-columns-header--3 {
    grid-template-columns:
      minmax(0, 1fr) var(--ds-size-icon-md) minmax(0, 1fr)
      var(--ds-size-icon-md) minmax(0, 1fr);
  }
}
</style>
