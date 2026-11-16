<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';
import Tooltip from '../Tooltip/Tooltip.vue';

/**
 * An icon-only action. `label` is required: it is the accessible name and the tooltip (F-11, F-27).
 * Include the object in the label for repeated actions, e.g. "Delete risk Log retention gap".
 * Other attributes (e.g. data-test) reach the button or link itself.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    icon: IconName;
    label: string;
    variant?: 'tertiary' | 'secondary';
    size?: 'sm' | 'md';
    to?: RouteLocationRaw;
    disabledReason?: string;
    /** For toggle buttons, e.g. collapsing the nav rail. */
    expanded?: boolean;
    controls?: string;
  }>(),
  {
    variant: 'tertiary',
    size: 'md',
    to: undefined,
    disabledReason: undefined,
    expanded: undefined,
    controls: undefined,
  },
);
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const open = ref(false);
const tip = computed(() =>
  props.disabledReason
    ? `${props.label}: ${props.disabledReason}`
    : props.label,
);
const classes = computed(() => [
  'icon-button',
  `icon-button--${props.variant}`,
  `icon-button--${props.size}`,
  { 'icon-button--disabled': props.disabledReason },
]);

function onClick(event: MouseEvent): void {
  if (props.disabledReason) {
    event.preventDefault();
    open.value = true;
    return;
  }
  emit('click', event);
}
</script>

<template>
  <Tooltip v-model:open="open" :text="tip">
    <RouterLink
      v-if="to && !disabledReason"
      v-bind="$attrs"
      :to="to"
      :class="classes"
      :aria-label="label"
    >
      <Icon :name="icon" />
    </RouterLink>
    <button
      v-else
      v-bind="$attrs"
      type="button"
      :class="classes"
      :aria-label="label"
      :aria-disabled="disabledReason ? 'true' : undefined"
      :aria-expanded="expanded"
      :aria-controls="controls"
      @click="onClick"
    >
      <Icon :name="icon" />
    </button>
  </Tooltip>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: var(--ds-border-width) solid transparent;
  border-radius: var(--ds-radius-none);
  background: transparent;
  color: var(--ds-color-text-primary);
  cursor: pointer;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.icon-button--md {
  width: var(--ds-size-control-md);
  height: var(--ds-size-control-md);
}

.icon-button--sm {
  width: var(--ds-size-control-sm);
  height: var(--ds-size-control-sm);
}

.icon-button:hover {
  background: var(--ds-color-surface-hover);
}

.icon-button--secondary {
  background: var(--ds-color-action-secondary-bg);
  border-color: var(--ds-color-border-strong);
}

.icon-button.icon-button--disabled {
  background: transparent;
  border: var(--ds-border-width) dashed var(--ds-color-border-strong);
  color: var(--ds-color-text-disabled);
  cursor: not-allowed;
}
</style>
