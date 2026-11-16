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
    /** Sticks to the top of the scroller, or with 'bottom' to its foot (e.g. a pending-changes bar). */
    sticky?: boolean | 'bottom';
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
    :class="{
      'panel--dense': dense,
      'panel--sticky': sticky === true,
      'panel--sticky-bottom': sticky === 'bottom',
    }"
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
  gap: var(--ds-space-4);
  min-width: 0;
  padding: var(--ds-space-5);
  background: var(--ds-color-surface-raised);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-none);
}

.panel--dense {
  padding: var(--ds-space-3);
  gap: var(--ds-space-2);
}

.panel--sticky {
  position: sticky;
  top: 0;
  z-index: var(--ds-z-header);
}

.panel--sticky-bottom {
  position: sticky;
  bottom: 0;
  z-index: var(--ds-z-header);
  box-shadow: var(--ds-shadow-raised);
}

.panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-3);
}

.panel__titles {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.panel__title {
  font-family: var(--ds-font-display);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-card);
  line-height: var(--ds-leading-snug);
}

.panel__title--h2 {
  font-size: var(--ds-font-size-h2);
}

.panel__title--h3 {
  font-size: var(--ds-font-size-h3);
}

.panel__description {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
</style>
