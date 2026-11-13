<script setup lang="ts">
import InventoryView from '@/views/InventoryView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Inventory (/inventory): system inventory from every source. The body and its actions are the
 * classic view (a legacy island) until rebuilt.
 */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Inventory"
      description="System inventory from every source."
    />
    <LegacyPage>
      <InventoryView embedded />
    </LegacyPage>
  </Stack>
</template>
