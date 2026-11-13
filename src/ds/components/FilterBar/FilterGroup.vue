<script setup lang="ts">
/**
 * A FilterBar field made of several choices, e.g. status checkboxes: a <fieldset> whose
 * <legend> looks like a field label, with the options in a wrapping row (F-11, 1.3.1).
 */
defineProps<{ legend: string }>();
</script>

<template>
  <fieldset class="filter-group">
    <legend class="filter-group__legend">{{ legend }}</legend>
    <div class="filter-group__options"><slot /></div>
  </fieldset>
</template>

<style scoped>
.filter-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.filter-group__legend {
  padding: 0 0 var(--ds-space-1);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

.filter-group__options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2) var(--ds-space-4);
  min-height: var(--ds-size-control-md);
}
</style>
