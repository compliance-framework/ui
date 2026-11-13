<script setup lang="ts">
import { useId } from 'vue';

/**
 * A titled region on a raised surface: the one card style (F-30 had ten). With a title it is a
 * labelled section landmark; actions sit top-right; padding is the ui-remake 20px.
 */
withDefaults(
  defineProps<{
    title?: string;
    ariaLabel?: string;
    description?: string;
    level?: 2 | 3;
    dense?: boolean;
    sticky?: boolean;
  }>(),
  {
    title: undefined,
    ariaLabel: undefined,
    description: undefined,
    level: 2,
    dense: false,
    sticky: false,
  },
);
const headingId = useId();
</script>

<template>
  <section
    class="panel"
    :class="{ 'panel--dense': dense, 'panel--sticky': sticky }"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabel ? undefined : title ? headingId : undefined"
  >
    <header v-if="title || $slots.actions" class="panel__header">
      <div class="panel__titles">
        <component
          :is="`h${level}`"
          v-if="title"
          :id="headingId"
          class="panel__title"
          :class="`panel__title--h${level}`"
        >
          {{ title }}
        </component>
        <p v-if="description" class="panel__description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border-subtle);
  border-radius: var(--radius-none);
}

.panel--dense {
  padding: var(--space-3);
  gap: var(--space-2);
}

.panel--sticky {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
}

.panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.panel__titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.panel__title {
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-card);
  line-height: var(--leading-snug);
}

.panel__title--h2 {
  font-size: var(--font-size-h2);
}

.panel__title--h3 {
  font-size: var(--font-size-h3);
}

.panel__description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
