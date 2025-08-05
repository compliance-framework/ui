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
import type { Control } from '@/oscal';
import {
  useEvidenceStore,
  type ComplianceIntervalStatus,
} from '@/stores/evidence';
import { onMounted, ref } from 'vue';

const { control } = defineProps<{
  control: Control;
}>();

const evidenceStore = useEvidenceStore();
const evidenceCounts = ref<ComplianceIntervalStatus[]>([]);

onMounted(() => {
  evidenceStore.getComplianceForControl(control).then((compliance) => {
    evidenceCounts.value = compliance.data || [];
  });
});
</script>
