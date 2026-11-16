<script lang="ts" setup>
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';
import { computed } from 'vue';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';
import EvidenceCounts from '@/screens/EvidenceCounts.vue';

const { dashboardId } = defineProps<{
  dashboardId: string;
}>();

const { data: evidenceCounts } = useDataApi<ComplianceIntervalStatus[]>(
  `/api/evidence/compliance-by-filter/${dashboardId}`,
);

const counts = computed(() =>
  computeEvidenceStatusCounts(evidenceCounts.value || []),
);
</script>

<template>
  <EvidenceCounts
    :green="counts.green"
    :red="counts.red"
    :gray="counts.gray"
    quiet
  />
</template>
