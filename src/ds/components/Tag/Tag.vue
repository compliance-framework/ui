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
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  background: var(--ds-color-surface-sunken);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-body);
  overflow-wrap: anywhere;
}

.tag--added {
  color: var(--ds-color-status-success-fg);
  border-color: var(--ds-color-status-success-fg);
  background: var(--ds-color-status-success-bg);
}

.tag--removed {
  color: var(--ds-color-status-error-fg);
  border-color: var(--ds-color-status-error-fg);
  background: var(--ds-color-status-error-bg);
  text-decoration: line-through;
}
</style>
