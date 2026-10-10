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
import { computed, watch } from 'vue';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';

const { control, sspId } = defineProps<{
  control: Control;
  /**
   * Scope the count to this SSP: the endpoint keeps global + same-SSP filters and
   * drops filters scoped to other plans. Without it the badge sums evidence across
   * every SSP's dashboards.
   */
  sspId?: string | null;
}>();

const { data: evidenceCounts, execute } = useDataApi<
  ComplianceIntervalStatus[]
>(`/api/evidence/compliance-by-control/${control.id}`, { params: { sspId } });

// The tree may keep this component alive across SSP switches, so re-fetch when the
// selected plan changes rather than relying on a remount.
watch(
  () => sspId,
  (id) => {
    void execute({ params: { sspId: id } });
  },
);

const counts = computed(() =>
  computeEvidenceStatusCounts(evidenceCounts.value || []),
);
</script>
