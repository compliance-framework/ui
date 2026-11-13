<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import RiskDetailView from '@/views/risk/RiskDetailView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Button from '@/ds/components/Button/Button.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * A risk (/risks/:riskId, or under its SSP): the design-system title and Back, over the classic
 * risk page (a legacy island: overview, tabs, editors and remediation), which still works out
 * which register it belongs to and where Back goes.
 */
const route = useRoute();
const body = ref<InstanceType<typeof RiskDetailView>>();
const title = computed(() => body.value?.riskTitle || 'Risk');
</script>

<template>
  <Stack gap="6">
    <PageHeader :title="title">
      <template #actions>
        <Button icon="back" @click="body?.goBackToPreviousPage()">Back</Button>
      </template>
    </PageHeader>
    <LegacyPage>
      <RiskDetailView ref="body" :key="String(route.params.riskId)" embedded />
    </LegacyPage>
  </Stack>
</template>
