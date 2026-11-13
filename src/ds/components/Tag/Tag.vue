<script setup lang="ts">
/** A label that is not a status, e.g. an evidence label `provider=AWS` (StatusBadge is for status only). */
defineProps<{ label: string; change?: 'added' | 'removed' }>();
</script>

<template>
  <span class="tag" :class="change ? `tag--${change}` : undefined">
    <template v-if="change"
      >{{ change === 'added' ? 'Added' : 'Removed' }} · </template
    >{{ label }}
  </span>
</template>

<style scoped>
.tag {
  display: inline-block;
  max-width: 100%;
  padding: 0 var(--space-2);
  border: var(--border-width) solid var(--color-border-strong);
  background: var(--color-surface-sunken);
  font-size: var(--font-size-caption);
  line-height: var(--leading-body);
  overflow-wrap: anywhere;
}

.tag--added {
  color: var(--color-status-success-fg);
  border-color: var(--color-status-success-fg);
  background: var(--color-status-success-bg);
}

.tag--removed {
  color: var(--color-status-error-fg);
  border-color: var(--color-status-error-fg);
  background: var(--color-status-error-bg);
  text-decoration: line-through;
}
</style>
