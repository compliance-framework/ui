<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';
import Tooltip from '../Tooltip/Tooltip.vue';

/**
 * The one button (F-15). Four tiers: primary (one per region), secondary, tertiary, danger.
 * A button is disabled only with a reason (P7, F-19 AC3): it stays focusable with aria-disabled,
 * the reason is announced via aria-describedby and shown on hover, focus and tap. Attributes
 * such as `aria-label` ("Assign people to System owner") always reach the button itself, disabled
 * or not, so every row's button keeps its own name.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
    size?: 'sm' | 'md';
    icon?: IconName;
    iconEnd?: IconName;
    /** Renders a link styled as a button. */
    to?: RouteLocationRaw;
    type?: 'button' | 'submit';
    loading?: boolean;
    /** Allows long record names to wrap within the available width. */
    wrap?: boolean;
    /** Disables the button and explains why. */
    disabledReason?: string;
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    icon: undefined,
    iconEnd: undefined,
    to: undefined,
    type: 'button',
    loading: false,
    wrap: false,
    disabledReason: undefined,
  },
);
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const reasonId = useId();
const reasonOpen = ref(false);
const disabled = computed(() => Boolean(props.disabledReason) || props.loading);
const classes = computed(() => [
  'button',
  `button--${props.variant}`,
  `button--${props.size}`,
  { 'button--disabled': props.disabledReason, 'button--wrap': props.wrap },
]);

function onClick(event: MouseEvent): void {
  if (disabled.value) {
    event.preventDefault();
    if (props.disabledReason) reasonOpen.value = true;
    return;
  }
  emit('click', event);
}
</script>

<template>
  <Tooltip
    v-if="disabledReason"
    v-model:open="reasonOpen"
    :text="disabledReason"
  >
    <button
      v-bind="$attrs"
      :type="type"
      :class="classes"
      aria-disabled="true"
      :aria-describedby="reasonId"
      @click="onClick"
    >
      <Icon v-if="icon" :name="icon" />
      <span><slot /></span>
      <Icon v-if="iconEnd" :name="iconEnd" />
      <span :id="reasonId" class="visually-hidden" aria-hidden="true">{{
        disabledReason
      }}</span>
    </button>
  </Tooltip>
  <RouterLink v-else-if="to" v-bind="$attrs" :to="to" :class="classes">
    <Icon v-if="icon" :name="icon" />
    <span><slot /></span>
    <Icon v-if="iconEnd" :name="iconEnd" />
  </RouterLink>
  <button
    v-else
    v-bind="$attrs"
    :type="type"
    :class="classes"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <Icon v-if="loading" name="loading" class="button__spinner" />
    <Icon v-else-if="icon" :name="icon" />
    <span><slot /></span>
    <Icon v-if="iconEnd" :name="iconEnd" />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: var(--size-target-min);
  padding: 0 var(--space-4);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-none);
  font-family: var(--font-ui);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-tight);
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.button--md {
  height: var(--size-control-md);
}

.button--sm {
  height: var(--size-control-sm);
  padding: 0 var(--space-3);
}

.button--wrap {
  max-width: 100%;
  height: auto;
  min-height: var(--size-control-md);
  padding-block: var(--space-2);
  white-space: normal;
  text-align: start;
}

.button--wrap.button--sm {
  min-height: var(--size-control-sm);
}

.button--wrap > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.button--primary {
  background: var(--color-action-primary-bg);
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary-fg);
}

.button--primary:hover {
  background: var(--color-action-primary-bg-hover);
}

.button--secondary {
  background: var(--color-action-secondary-bg);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}

.button--secondary:hover {
  background: var(--color-action-secondary-bg-hover);
}

.button--tertiary {
  background: transparent;
  color: var(--color-text-primary);
}

.button--tertiary:hover {
  background: var(--color-surface-hover);
}

.button--danger {
  background: var(--color-action-danger-bg);
  border-color: var(--color-action-danger-fg);
  color: var(--color-action-danger-fg);
}

.button.button--disabled,
.button.button--disabled:hover {
  background: transparent;
  border: var(--border-width) dashed var(--color-border-strong);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.button__spinner {
  animation: spin calc(var(--duration-slow) * 4) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
</style>
