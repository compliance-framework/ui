<script setup lang="ts">
import { computed } from 'vue';
import {
  useRoute,
  type LocationQueryRaw,
  type RouteLocationRaw,
} from 'vue-router';

interface Props {
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: RouteLocationRaw;
  hint?: string;
  eyebrow?: string;
  includeNext?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hint: '',
  eyebrow: 'Prerequisite Required',
  includeNext: true,
});

const route = useRoute();

const resolvedCtaTo = computed<RouteLocationRaw>(() => {
  if (!props.includeNext || typeof props.ctaTo === 'string') {
    return props.ctaTo;
  }

  const target = props.ctaTo as Exclude<RouteLocationRaw, string>;
  const nextQuery = { ...(target.query || {}) } as LocationQueryRaw;
  if (!nextQuery.next) {
    nextQuery.next = route.fullPath;
  }

  return {
    ...target,
    query: nextQuery,
  };
});
</script>

<template>
  <section
    class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
  >
    <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
      {{ eyebrow }}
    </p>
    <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
      {{ title }}
    </h2>
    <p class="mt-3 max-w-[70ch] text-[var(--ui-v2-muted-foreground)]">
      {{ description }}
    </p>

    <RouterLink
      :to="resolvedCtaTo"
      class="ui-v2-nav mt-5 inline-flex items-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
    >
      {{ ctaLabel }}
    </RouterLink>

    <p
      v-if="hint"
      class="ui-v2-meta mt-3 text-[var(--ui-v2-tertiary-foreground)]"
    >
      {{ hint }}
    </p>
  </section>
</template>
