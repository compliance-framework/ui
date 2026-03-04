<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

type StateKind = 'loading' | 'error' | 'empty' | 'info';

interface Props {
  kind?: StateKind;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: RouteLocationRaw;
}

const props = withDefaults(defineProps<Props>(), {
  kind: 'empty',
  ctaLabel: '',
  ctaTo: undefined,
});

const panelClass = computed(() => {
  if (props.kind === 'error') {
    return 'ui-v2-radius-none border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-6';
  }

  if (props.kind === 'info') {
    return 'ui-v2-radius-none border border-[var(--ui-v2-info)] bg-[var(--ui-v2-info-tint-10)] p-6';
  }

  if (props.kind === 'loading') {
    return 'ui-v2-surface-muted p-6';
  }

  return 'ui-v2-surface-base border-dashed p-6';
});

const titleClass = computed(() => {
  if (props.kind === 'error') {
    return 'text-[var(--ui-v2-error)]';
  }

  return 'text-[var(--ui-v2-secondary-foreground)]';
});

const ctaClass = computed(() => {
  if (props.kind === 'error') {
    return 'border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] text-[var(--ui-v2-background)]';
  }

  if (props.kind === 'info') {
    return 'border-[var(--ui-v2-info)] bg-[var(--ui-v2-info)] text-[var(--ui-v2-background)]';
  }

  return 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] text-[var(--ui-v2-primary-foreground)]';
});
</script>

<template>
  <section :class="panelClass">
    <p class="ui-v2-nav" :class="titleClass">{{ title }}</p>
    <p class="mt-2 text-[var(--ui-v2-foreground)]">{{ description }}</p>

    <div v-if="$slots.actions || (ctaLabel && ctaTo)" class="mt-4">
      <slot name="actions">
        <RouterLink
          :to="ctaTo"
          class="ui-v2-nav inline-flex items-center border px-4 py-2 font-semibold"
          :class="ctaClass"
        >
          {{ ctaLabel }}
        </RouterLink>
      </slot>
    </div>
  </section>
</template>
