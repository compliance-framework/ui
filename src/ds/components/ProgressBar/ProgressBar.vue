<script setup lang="ts">
import { computed, useId } from 'vue';
import { toneVars, type StatusTone } from '../StatusBadge/statuses';

/**
 * A labelled progress bar: role="progressbar" with min, max, value and value text, and a visible
 * label and value such as "38 of 60 satisfied · 63%" (F-17). The track has a strong boundary so
 * it meets 3:1 (1.4.11). The fill defaults to the indicator colour; `tone` uses a status colour.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    max: number;
    valueText?: string;
    tone?: StatusTone;
  }>(),
  {
    valueText: undefined,
    tone: undefined,
  },
);

const labelId = useId();
const percent = computed(() =>
  props.max > 0
    ? Math.round(
        (Math.min(Math.max(props.value, 0), props.max) / props.max) * 100,
      )
    : 0,
);
const text = computed(
  () => props.valueText ?? `${props.value} of ${props.max} · ${percent.value}%`,
);
const fill = computed(() => ({
  ...(props.tone
    ? { '--progress-fill': toneVars(props.tone)['--tone-fg'] }
    : {}),
  width: `${percent.value}%`,
}));
</script>

<template>
  <div class="progress">
    <div class="progress__header">
      <span :id="labelId" class="progress__label">{{ label }}</span>
      <span class="progress__value" aria-hidden="true">{{ text }}</span>
    </div>
    <div
      class="progress__track"
      role="progressbar"
      :aria-labelledby="labelId"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="value"
      :aria-valuetext="text"
    >
      <div class="progress__fill" :style="fill" />
    </div>
  </div>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.progress__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--ds-space-1) var(--ds-space-3);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.progress__label {
  font-weight: var(--ds-font-weight-semibold);
}

.progress__value {
  color: var(--ds-color-text-secondary);
}

.progress__track {
  --progress-fill: var(--ds-color-indicator);
  height: var(--ds-space-2);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
}

.progress__fill {
  height: 100%;
  background: var(--progress-fill);
  transition: width var(--ds-duration-base) var(--ds-ease-standard);
}
</style>
