<script setup lang="ts">
import { useId } from 'vue';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';

/**
 * Show/hide a region with a real button (F-09 AC1): aria-expanded, aria-controls, a visible
 * chevron, Enter and Space via the native button. `nav` is the compact sidebar group style.
 */
withDefaults(
  defineProps<{
    label: string;
    icon?: IconName;
    variant?: 'default' | 'nav';
    active?: boolean;
  }>(),
  {
    icon: undefined,
    variant: 'default',
    active: false,
  },
);
const open = defineModel<boolean>('open', { default: false });
const regionId = useId();
</script>

<template>
  <div class="disclosure" :class="`disclosure--${variant}`">
    <button
      type="button"
      class="disclosure__trigger"
      :aria-expanded="open"
      :aria-controls="regionId"
      :aria-current="active ? 'location' : undefined"
      @click="open = !open"
    >
      <Icon v-if="icon" :name="icon" />
      <span class="disclosure__label">{{ label }}</span>
      <Icon name="expand" class="disclosure__chevron" />
    </button>
    <div v-show="open" :id="regionId" class="disclosure__region">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.disclosure__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--size-control-md);
  padding: 0 var(--space-3);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
  text-align: start;
  cursor: pointer;
}

.disclosure__trigger:hover {
  background: var(--color-surface-hover);
}

.disclosure__label {
  flex: 1;
  min-width: 0;
}

.disclosure__chevron {
  transition: transform var(--duration-fast) var(--ease-standard);
}

.disclosure__trigger[aria-expanded='true'] .disclosure__chevron {
  transform: rotate(180deg);
}

.disclosure--default .disclosure__trigger {
  border-bottom: var(--border-width) solid var(--color-border-subtle);
}

.disclosure--default .disclosure__region {
  padding: var(--space-3);
}

.disclosure--nav .disclosure__trigger {
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  border-left: var(--border-width-indicator) solid transparent;
}

.disclosure--nav .disclosure__trigger:hover {
  color: var(--color-text-primary);
}

.disclosure--nav .disclosure__trigger[aria-current='location'] {
  border-left-color: var(--color-indicator);
  background: var(--color-surface-selected);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}
</style>
