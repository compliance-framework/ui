<script setup lang="ts">
import { computed, watch } from 'vue';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';
import {
  computeEvidenceStatusCounts,
  evidenceStatus,
} from '@/composables/useEvidenceStatusCounts';
import StatusPill from '@/ds/components/StatusPill/StatusPill.vue';

/**
 * The evidence for a control, or for one evidence filter, as one pill in three states: Satisfied
 * (green), Not satisfied (red) or Unknown (grey, also when there is no evidence). Nothing shows
 * until the results arrive. A control's results are scoped to `sspId`: global filters and that
 * plan's. A change of `refreshKey` (e.g. the control's filters) fetches them again.
 */
const props = defineProps<{
  controlId?: string;
  filterId?: string;
  sspId?: string | null;
  refreshKey?: string;
}>();

const url = computed(() =>
  props.filterId
    ? `/api/evidence/compliance-by-filter/${props.filterId}`
    : `/api/evidence/compliance-by-control/${props.controlId}`,
);
const params = () => (props.filterId ? {} : { sspId: props.sspId });
const { data, execute } = useDataApi<ComplianceIntervalStatus[]>(url.value, {
  params: params(),
});
watch(
  () => [url.value, props.sspId, props.refreshKey],
  () => void execute(url.value, { params: params() }).catch(() => undefined),
);

const status = computed(() =>
  data.value ? evidenceStatus(computeEvidenceStatusCounts(data.value)) : null,
);
</script>

<template>
  <StatusPill v-if="status" :status="status" />
</template>
