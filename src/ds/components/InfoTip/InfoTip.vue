<script setup lang="ts">
import { ref } from 'vue';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';
import Tooltip from '../Tooltip/Tooltip.vue';

/**
 * A small icon that explains a nearby value, e.g. why a field can't be edited. It is a button, so
 * the note is reachable by keyboard: it opens on hover, focus, click and tap, and closes on Escape or when focus leaves.
 * The text is also its accessible name. Keep the note short and supplementary (Tooltip's rule);
 * the tone colours the icon only, so the icon's shape must carry the meaning too.
 * Other attributes (e.g. data-test) reach the button.
 */
defineOptions({ inheritAttrs: false });
withDefaults(
  defineProps<{
    text: string;
    icon?: IconName;
    tone?: 'neutral' | 'warning' | 'error';
  }>(),
  { icon: 'info', tone: 'neutral' },
);
const open = ref(false);
</script>

<template>
  <Tooltip v-model:open="open" :text="text">
    <button
      v-bind="$attrs"
      type="button"
      class="info-tip"
      :class="`info-tip--${tone}`"
      :aria-label="text"
      @click="open = true"
    >
      <Icon :name="icon" size="sm" />
    </button>
  </Tooltip>
</template>

<style scoped>
.info-tip {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: var(--ds-size-target-min);
  min-height: var(--ds-size-target-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-text-secondary);
  cursor: help;
  vertical-align: middle;
}

.info-tip--warning {
  color: var(--ds-color-status-warning-fg);
}

.info-tip--error {
  color: var(--ds-color-status-error-fg);
}

.info-tip:hover {
  background: var(--ds-color-surface-hover);
}
</style>
