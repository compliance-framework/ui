<template>
  <ResultStatusBadge
    v-if="evidenceCounts?.reduce((total, current) => total + current.count, 0)"
    :gray="
      evidenceCounts?.reduce(
        (total, current) =>
          ['satisfied', 'not-satisfied'].includes(current.status?.toLowerCase())
            ? total
            : total + current.count,
        0,
      )
    "
    :red="
      evidenceCounts?.reduce(
        (total, current) =>
          current.status?.toLowerCase() == 'not-satisfied'
            ? total + current.count
            : total,
        0,
      )
    "
    :green="
      evidenceCounts?.reduce(
        (total, current) =>
          current.status?.toLowerCase() == 'satisfied'
            ? total + current.count
            : total,
        0,
      )
    "
  ></ResultStatusBadge>
</template>

<script lang="ts" setup>
import ResultStatusBadge from '@/components/ResultStatusBadge.vue';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';

const { dashboardId } = defineProps<{
  dashboardId: string;
}>();

const { data: evidenceCounts } = useDataApi<ComplianceIntervalStatus[]>(
  `/api/evidence/compliance-by-filter/${dashboardId}`,
);
</script>
