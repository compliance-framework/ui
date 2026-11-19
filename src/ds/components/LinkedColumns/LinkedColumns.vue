<script setup lang="ts">
import Icon from '../Icon/Icon.vue';

/**
 * Records that lead one to the next, side by side: e.g. a control, then how it is implemented,
 * then the evidence that checks it. Each column is a bordered box filled from the slot named by
 * its key, with an arrow to the next. Like Split, it responds to the content area's width (a
 * container query): when there is no room for the columns they stack, each box shows its column
 * label, and the arrows point down. Put a LinkedColumnsHeader above a list of rows to label the
 * columns once while they sit side by side.
 */
defineProps<{ columns: { key: string; label: string }[] }>();
</script>

<template>
  <div class="linked-columns">
    <template v-for="(column, index) in columns" :key="column.key">
      <span v-if="index > 0" class="linked-columns__arrow" aria-hidden="true">
        <Icon name="next" />
      </span>
      <section class="linked-columns__box" :aria-label="column.label">
        <span class="linked-columns__label" aria-hidden="true">{{
          column.label
        }}</span>
        <slot :name="column.key" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.linked-columns {
  display: grid;
  gap: var(--ds-space-1);
  min-width: 0;
}

.linked-columns__box {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  min-width: 0;
  padding: var(--ds-space-4);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.linked-columns__label {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

.linked-columns__arrow {
  display: flex;
  justify-content: center;
  color: var(--ds-color-text-secondary);
  transform: rotate(90deg);
}

@container (min-width: 840px) {
  .linked-columns {
    grid-template-columns:
      minmax(0, 1fr) var(--ds-size-icon-md) minmax(0, 1fr)
      var(--ds-size-icon-md) minmax(0, 1fr);
    align-items: stretch;
  }

  .linked-columns__label {
    display: none;
  }

  .linked-columns__arrow {
    align-items: center;
    transform: none;
  }
}
</style>
