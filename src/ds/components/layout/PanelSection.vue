<script setup lang="ts">
import { useId } from 'vue';

/**
 * A titled section inside a Panel, divided from the one above by a rule: one surface with
 * headings instead of a stack of bordered panels, for a record shown in a narrow pane. A labelled
 * section with an h3 by default; actions sit top-right as in Panel.
 */
withDefaults(
  defineProps<{
    title: string;
    ariaLabel?: string;
    description?: string;
    level?: 2 | 3 | 4;
  }>(),
  {
    description: undefined,
    ariaLabel: undefined,
    level: 3,
  },
);
const headingId = useId();
</script>

<template>
  <section
    class="panel-section"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabel ? undefined : headingId"
  >
    <header class="panel-section__header">
      <div class="panel-section__titles">
        <component
          :is="`h${level}`"
          :id="headingId"
          class="panel-section__title"
          >{{ title }}</component
        >
        <p v-if="description" class="panel-section__description">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="panel-section__actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--color-border-subtle);
}

.panel-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
}

.panel-section__titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.panel-section__title {
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-card);
  line-height: var(--leading-snug);
}

.panel-section__description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.panel-section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
