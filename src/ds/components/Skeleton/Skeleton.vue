<script setup lang="ts">
import { computed } from 'vue';

/**
 * Loading placeholder in the shape of the content to come (F-14). Decorative (aria-hidden):
 * DataState supplies the accessible "Loading …" text. The shimmer runs on the duration tokens,
 * so it stops under reduced motion. `count` is lines for text and panel, rows for table.
 */
const props = withDefaults(
  defineProps<{ variant?: 'text' | 'table' | 'panel'; count?: number }>(),
  {
    variant: 'text',
    count: undefined,
  },
);
const n = computed(() => props.count ?? (props.variant === 'table' ? 5 : 3));
</script>

<template>
  <div class="skeleton" :class="`skeleton--${variant}`" aria-hidden="true">
    <template v-if="variant === 'table'">
      <div
        v-for="row in n + 1"
        :key="row"
        class="skeleton__row"
        :class="{ 'skeleton__row--head': row === 1 }"
      >
        <span v-for="cell in 4" :key="cell" class="skeleton__bar" />
      </div>
    </template>
    <template v-else>
      <span
        v-if="variant === 'panel'"
        class="skeleton__bar skeleton__bar--title"
      />
      <span v-for="line in n" :key="line" class="skeleton__bar" />
    </template>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.skeleton--panel {
  padding: var(--space-5);
  border: var(--border-width) solid var(--color-border-subtle);
}

.skeleton--table {
  gap: 0;
}

.skeleton__bar {
  display: block;
  height: var(--space-3);
  background: linear-gradient(
    to right,
    var(--color-surface-sunken) 30%,
    var(--color-surface-base) 50%,
    var(--color-surface-sunken) 70%
  );
  background-size: 300% 100%;
  animation: skeleton-shimmer calc(var(--duration-slow) * 6) linear infinite;
}

.skeleton__bar:last-child {
  width: 60%;
}

.skeleton__bar--title {
  width: 40%;
  height: var(--space-5);
  margin-block-end: var(--space-2);
}

.skeleton__row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  gap: var(--space-4);
  min-height: var(--size-control-md);
  border-block-end: var(--border-width) solid var(--color-border-subtle);
}

.skeleton__row--head {
  border-block-end-color: var(--color-border-strong);
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton__bar {
    animation: none;
  }
}
</style>
