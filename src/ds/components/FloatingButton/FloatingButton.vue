<script setup lang="ts">
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';

/**
 * A button pinned to the bottom corner of the screen, above the page, for an app-wide action
 * (e.g. demo feedback). Icon and visible label; it sits below toasts and dialogs.
 */
defineProps<{ label: string; icon?: IconName }>();
const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button type="button" class="floating-button" @click="emit('click', $event)">
    <Icon v-if="icon" :name="icon" size="sm" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.floating-button {
  position: fixed;
  inset-block-end: var(--ds-space-page-x);
  inset-inline-end: var(--ds-space-page-x);
  z-index: var(--ds-z-header);
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-4);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
  background: var(--ds-color-surface-raised);
  box-shadow: var(--ds-shadow-raised);
  color: var(--ds-color-text-primary);
  font: inherit;
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-semibold);
  cursor: pointer;
}
.floating-button:hover {
  background: var(--ds-color-surface-hover);
}
</style>
