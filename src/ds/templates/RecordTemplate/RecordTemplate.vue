<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * The Record template (04 §4.2): the record's title as the only h1, status, key
 * facts, one primary action and an overflow menu; then a banner, optional route-bound tabs and
 * the body, with an optional context panel beside it once the content area is wide enough
 * (breakpoint `columns`; below it otherwise).
 * Every record type puts these in the same places (P9, F-30).
 */
defineProps<{
  title: string;
  compact?: boolean;
  description?: string;
  /** Route-bound tabs; the routed view goes in the default slot. */
  tabs?: { label: string; to: RouteLocationRaw; count?: number }[];
  /** Accessible name of the context panel, e.g. "Risk context". */
  asideLabel?: string;
}>();
</script>

<template>
  <Stack :gap="compact ? '4' : '6'">
    <PageHeader :title="title" :compact="compact" :description="description">
      <template v-if="$slots.status" #status><slot name="status" /></template>
      <template v-if="$slots.facts" #facts><slot name="facts" /></template>
      <template v-if="$slots.actions" #actions
        ><slot name="actions"
      /></template>
    </PageHeader>
    <slot name="banner" />
    <div class="record" :class="{ 'record--with-aside': $slots.aside }">
      <div class="record__main">
        <Tabs v-if="tabs" :label="`${title}: sections`" :tabs="tabs"
          ><slot
        /></Tabs>
        <slot v-else />
      </div>
      <aside v-if="$slots.aside" class="record__aside" :aria-label="asideLabel">
        <slot name="aside" />
      </aside>
    </div>
  </Stack>
</template>

<style scoped>
.record {
  display: grid;
  gap: var(--ds-space-6);
  min-width: 0;
}

.record__main,
.record__aside {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-6);
  min-width: 0;
}

@container (min-width: 960px) {
  .record--with-aside {
    grid-template-columns: minmax(0, 1fr) var(--ds-width-column-lg);
    align-items: start;
  }
}
</style>
