<script setup lang="ts">
import SubjectTemplatesView from '@/views/admin/SubjectTemplatesView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Subject templates (/admin/subject-templates, admin): how evidence subjects are named and grouped. The page body, including its actions, is the classic view (a legacy island) until it is
 * rebuilt; this screen gives it the design-system header.
 */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Subject Templates"
      description="Reusable templates for the subjects evidence is about."
    />
    <LegacyPage>
      <SubjectTemplatesView embedded />
    </LegacyPage>
  </Stack>
</template>
