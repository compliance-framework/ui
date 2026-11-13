<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { ProfileComplianceProgress } from '@/types/compliance';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import ComplianceProgressView from '../compliance/ComplianceProgressView.vue';

/**
 * A profile's Compliance tab: how every system using the profile measures up, as totals,
 * breakdowns and controls (the same view as This System > Compliance).
 */
const route = useRoute();
const progress = useApiQuery<ProfileComplianceProgress>(
  `/api/oscal/profiles/${String(route.params.id)}/compliance-progress`,
  { config: { params: { includeControls: true } } },
);
</script>

<template>
  <DataState
    :status="progress.status.value"
    subject="compliance progress"
    skeleton="panel"
    @retry="progress.retry"
  >
    <ComplianceProgressView
      v-if="progress.data.value"
      :progress="progress.data.value"
    />
  </DataState>
</template>
