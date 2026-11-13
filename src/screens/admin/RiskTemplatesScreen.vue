<script setup lang="ts">
import RiskTemplatesView from '@/views/admin/RiskTemplatesView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Risk templates (/admin/risk-templates, admin): reusable risks that policies raise when evidence fails. The page body, including its actions, is the classic view (a legacy island) until it is
 * rebuilt; this screen gives it the design-system header.
 */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Risk Templates"
      description="Reusable risks, raised automatically when evidence fails a policy."
    />
    <LegacyPage>
      <RiskTemplatesView embedded />
    </LegacyPage>
  </Stack>
</template>
