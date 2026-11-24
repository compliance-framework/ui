<script setup lang="ts">
import { computed, watch } from 'vue';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useDataApi } from '@/composables/axios';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';
import EvidenceCounts from './EvidenceCounts.vue';

/**
 * The evidence for a control, or for one evidence filter, as a capsule counting its current
 * results: satisfied (green), unknown (grey) and not satisfied (red), as in the classic UI. Nothing
 * shows until the results arrive; then, with none, "No evidence yet." unless `quiet`. A control's
 * results are scoped to `sspId`: global filters and that plan's. A change of `refreshKey` (e.g. the
 * control's filters) fetches them again.
 */
const props = defineProps<{
  controlId?: string;
  filterId?: string;
  sspId?: string | null;
  refreshKey?: string;
  quiet?: boolean;
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

const counts = computed(() =>
  data.value ? computeEvidenceStatusCounts(data.value) : null,
);
</script>

<template>
  <EvidenceCounts
    v-if="counts"
    :green="counts.green"
    :gray="counts.gray"
    :red="counts.red"
    :quiet="quiet"
  />
</template>
