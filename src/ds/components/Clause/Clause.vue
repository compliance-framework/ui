<script setup lang="ts">
import Tooltip from '../Tooltip/Tooltip.vue';

/**
 * One clause of a document set out like a legal text: its label ("a.", "1.", "(a)") hangs to the
 * left of its text, and each `depth` (0 to 3) indents it one step under its parent. The
 * `annotation` slot holds something said about the clause rather than part of it, e.g. how it is
 * implemented: it sits a further step in, behind an accent rule and in the body font, so it reads
 * as a note in the margin of the text, not as more of it. A label with a `hint` (e.g. the clause's
 * ID) shows it on hover and focus.
 */
withDefaults(defineProps<{ label?: string; hint?: string; depth?: number }>(), {
  label: '',
  hint: undefined,
  depth: 0,
});
</script>

<template>
  <div
    class="clause"
    :class="`clause--depth-${Math.min(depth, 3)}`"
    :style="{ '--clause-depth': Math.min(depth, 3) }"
  >
    <Tooltip v-if="label && hint" :text="hint">
      <span class="clause__label" tabindex="0">{{ label }}</span>
    </Tooltip>
    <span v-else class="clause__label">{{ label }}</span>
    <div class="clause__body">
      <div class="clause__text"><slot /></div>
      <div v-if="$slots.annotation" class="clause__annotation">
        <slot name="annotation" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.clause {
  /* One indent step; smaller on a phone, where four steps would leave little room for the text. */
  --clause-step: var(--ds-space-8);

  display: grid;
  grid-template-columns: var(--clause-step) minmax(0, 1fr);
  gap: var(--ds-space-2);
}

.clause--depth-1 {
  margin-left: var(--clause-step);
}

.clause--depth-2 {
  margin-left: calc(var(--clause-step) * 2);
}

.clause--depth-3 {
  margin-left: calc(var(--clause-step) * 3);
}

@media (max-width: 639px) {
  .clause {
    --clause-step: var(--ds-space-6);
  }

  .clause--depth-1,
  .clause--depth-2,
  .clause--depth-3 {
    margin-left: calc(var(--ds-space-4) * var(--clause-depth));
  }
}

.clause__label {
  align-self: start;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-prose);
  line-height: var(--ds-leading-prose);
  font-variant-numeric: tabular-nums;
}

.clause__label[tabindex] {
  cursor: help;
}

.clause__body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  min-width: 0;
}

.clause__text {
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-prose);
  line-height: var(--ds-leading-prose);
  overflow-wrap: anywhere;
}

.clause__annotation {
  margin-left: var(--ds-space-2);
  padding-left: var(--ds-space-4);
  border-left: var(--ds-border-width-indicator) solid var(--ds-color-indicator);
  font-size: var(--ds-font-size-body);
}
</style>
