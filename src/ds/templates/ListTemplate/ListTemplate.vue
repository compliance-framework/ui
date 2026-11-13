<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * The List template (04 §4.2): page header with the region's primary action top-right, then the
 * filter bar, the results (a DataState around a table) and the footer (pagination). Every list
 * keeps this order, so the create action is never below the table (F-30).
 *
 * A section with several lists, such as a system's Components (components, inventory, inherited,
 * shared), passes route-bound `tabs` (DEC-09): each tab is its own route and screen with the same
 * title and tabs, and the filter bar, results and footer form the tab panel.
 */
defineProps<{
  title: string;
  description?: string;
  tabs?: { label: string; to: RouteLocationRaw; count?: number }[];
}>();
</script>

<template>
  <Stack gap="6">
    <PageHeader :title="title" :description="description">
      <template v-if="$slots.actions" #actions
        ><slot name="actions"
      /></template>
    </PageHeader>
    <slot name="banner" />
    <Tabs v-if="tabs" :label="`${title}: lists`" :tabs="tabs">
      <Stack gap="6">
        <slot name="filters" />
        <slot />
        <slot name="footer" />
      </Stack>
    </Tabs>
    <template v-else>
      <slot name="filters" />
      <slot />
      <slot name="footer" />
    </template>
  </Stack>
</template>
