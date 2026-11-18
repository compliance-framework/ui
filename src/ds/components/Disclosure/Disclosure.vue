<script setup lang="ts">
import { useId } from 'vue';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';

/**
 * Show/hide a region with a real button (F-09 AC1): aria-expanded, aria-controls, a visible
 * chevron, Enter and Space via the native button. The chevron leads the label, pointing right
 * when closed and down when open, so it is seen however short the label on a wide row. `nav` is
 * the compact sidebar group style, with the chevron at the end (the group's icon leads).
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
      <Icon
        v-if="variant === 'default'"
        name="next"
        class="disclosure__chevron disclosure__chevron--lead"
      />
      <Icon v-if="icon" :name="icon" />
      <span class="disclosure__label">{{ label }}</span>
      <Icon
        v-if="variant === 'nav'"
        name="expand"
        class="disclosure__chevron"
      />
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
  gap: var(--ds-space-3);
  width: 100%;
  min-height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-3);
  border: none;
  background: transparent;
  color: var(--ds-color-text-primary);
  font-weight: var(--ds-font-weight-bold);
  text-align: start;
  cursor: pointer;
}

.disclosure__trigger:hover {
  background: var(--ds-color-surface-hover);
}

.disclosure__label {
  flex: 1;
  min-width: 0;
}

.disclosure__chevron {
  transition: transform var(--ds-duration-fast) var(--ds-ease-standard);
}

.disclosure__trigger[aria-expanded='true'] .disclosure__chevron {
  transform: rotate(180deg);
}

.disclosure__trigger[aria-expanded='true'] .disclosure__chevron--lead {
  transform: rotate(90deg);
}

.disclosure--default .disclosure__trigger {
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.disclosure--default .disclosure__region {
  padding: var(--ds-space-3);
}

.disclosure--nav .disclosure__trigger {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-medium);
  letter-spacing: var(--ds-tracking-wide);
  text-transform: uppercase;
  border-left: var(--ds-border-width-indicator) solid transparent;
}

.disclosure--nav .disclosure__trigger:hover {
  color: var(--ds-color-text-primary);
}

.disclosure--nav .disclosure__trigger[aria-current='location'] {
  border-left-color: var(--ds-color-indicator);
  background: var(--ds-color-surface-selected);
  color: var(--ds-color-text-primary);
  font-weight: var(--ds-font-weight-bold);
}
</style>
