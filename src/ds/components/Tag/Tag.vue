<script setup lang="ts">
/**
 * A label that is not a status, e.g. an evidence label `provider=AWS` (StatusBadge is for status
 * only): a borderless grey chip, like inline code in an editor. `code` sets it in the monospace
 * font, for values people type, such as labels.
 */
defineProps<{ label: string; change?: 'added' | 'removed'; code?: boolean }>();
</script>

<template>
  <span
    class="tag"
    :class="[change ? `tag--${change}` : undefined, { 'tag--code': code }]"
  >
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
  background: var(--ds-color-status-neutral-bg);
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-body);
  overflow-wrap: anywhere;
}

.tag--code {
  font-family: var(--ds-font-code);
}

.tag--added {
  color: var(--ds-color-status-success-fg);
  background: var(--ds-color-status-success-bg);
}

.tag--removed {
  color: var(--ds-color-status-error-fg);
  background: var(--ds-color-status-error-bg);
  text-decoration: line-through;
}
</style>
