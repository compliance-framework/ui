<template>
  <ResultStatusBadge
    v-if="counts.total"
    :gray="counts.gray"
    :red="counts.red"
    :green="counts.green"
  ></ResultStatusBadge>
</template>

<script lang="ts" setup>
import ResultStatusBadge from '@/components/ResultStatusBadge.vue';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';
import { computed } from 'vue';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';

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
