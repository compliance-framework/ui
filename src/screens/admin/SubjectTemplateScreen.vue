<script setup lang="ts">
import { useRoute } from 'vue-router';
import SubjectTemplateDetailView from '@/views/admin/SubjectTemplateDetailView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * A subject template (/admin/subject-templates/:id). The details and its actions are the classic
 * view (a legacy island) until rebuilt; this screen gives it the design-system header.
 */
const route = useRoute();
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[
        { label: 'Subject templates', to: { name: 'admin-subject-templates' } },
      ]"
    />
    <PageHeader title="Subject template" />
    <LegacyPage>
      <SubjectTemplateDetailView :key="String(route.params.id)" embedded />
    </LegacyPage>
  </Stack>
</template>
