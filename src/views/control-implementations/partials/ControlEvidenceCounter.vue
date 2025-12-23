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
import type { Control } from '@/oscal';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';
import { computed } from 'vue';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';

const { control } = defineProps<{
  control: Control;
}>();

const { data: evidenceCounts } = useDataApi<ComplianceIntervalStatus[]>(
  `/api/evidence/compliance-by-control/${control.id}`,
);

const counts = computed(() =>
  computeEvidenceStatusCounts(evidenceCounts.value || []),
);
</script>
