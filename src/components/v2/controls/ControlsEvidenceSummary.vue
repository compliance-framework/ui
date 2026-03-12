<script setup lang="ts">
import { computed } from 'vue';
import V2StatusChip from '@/components/v2/primitives/V2StatusChip.vue';
import {
  computeEvidenceStatusCounts,
  type EvidenceStatusCounts,
} from '@/composables/useEvidenceStatusCounts';

interface StatusEntry {
  status: string;
  count: number;
}

const props = withDefaults(
  defineProps<{
    entries?: StatusEntry[] | null;
    emptyLabel?: string;
  }>(),
  {
    entries: () => [],
    emptyLabel: 'NO DATA',
  },
);

const counts = computed<EvidenceStatusCounts>(() =>
  computeEvidenceStatusCounts(props.entries || []),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <template v-if="counts.total > 0">
      <V2StatusChip
        v-if="counts.green > 0"
        status="satisfied"
        :label="`OK ${counts.green}`"
      />
      <V2StatusChip
        v-if="counts.gray > 0"
        status="unknown"
        :label="`UNK ${counts.gray}`"
      />
      <V2StatusChip
        v-if="counts.red > 0"
        status="not-satisfied"
        :label="`ERR ${counts.red}`"
      />
    </template>

    <V2StatusChip v-else status="unknown" :label="emptyLabel" />
  </div>
</template>
