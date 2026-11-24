<script setup lang="ts">
import { useId } from 'vue';

/**
 * A titled section inside a Panel, divided from the one above by a rule: one surface with
 * headings instead of a stack of bordered panels, for a record shown in a narrow pane. A labelled
 * section with an h3 by default; actions sit top-right as in Panel. The `title-end` slot puts a
 * small status right after the title, e.g. the section's evidence counts. `divided` false drops the
 * rule, for a first section with nothing above it to divide from (e.g. right under a drawer's
 * header).
 */
withDefaults(
  defineProps<{
    title: string;
    ariaLabel?: string;
    description?: string;
    level?: 2 | 3 | 4;
    divided?: boolean;
  }>(),
  {
    divided: true,
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
    :class="{ 'panel-section--undivided': !divided }"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabel ? undefined : headingId"
  >
    <header class="panel-section__header">
      <div class="panel-section__titles">
        <div v-if="$slots['title-end']" class="panel-section__title-row">
          <component
            :is="`h${level}`"
            :id="headingId"
            class="panel-section__title"
            >{{ title }}</component
          >
          <slot name="title-end" />
        </div>
        <component
          :is="`h${level}`"
          v-else
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
  gap: var(--ds-space-3);
  min-width: 0;
  padding-top: var(--ds-space-4);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.panel-section--undivided {
  padding-top: 0;
  border-top: none;
}

.panel-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-2) var(--ds-space-3);
}

.panel-section__titles {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.panel-section__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
}

.panel-section__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-h3);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-card);
  line-height: var(--ds-leading-snug);
}

.panel-section__description {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}

.panel-section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
</style>
