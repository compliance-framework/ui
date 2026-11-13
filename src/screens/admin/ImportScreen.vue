<script setup lang="ts">
import ImportView from '@/views/admin/ImportView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Import (/admin/import): OSCAL documents, evidence filters and workflows from JSON files. The page body, including its actions, is the classic view (a legacy island) until it is
 * rebuilt; this screen gives it the design-system header.
 */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Import"
      description="Import OSCAL documents, evidence filters and workflows from JSON files."
    />
    <LegacyPage>
      <ImportView embedded />
    </LegacyPage>
  </Stack>
</template>
