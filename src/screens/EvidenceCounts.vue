<script setup lang="ts">
/**
 * Evidence results as status badges: how many are satisfied, not satisfied and unknown, or a
 * caption when there are none (or nothing, with `quiet`). Shared by the Implementation tree and
 * its statement editor; the catalog tree draws the same badges.
 */
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';

defineProps<{
  green: number;
  red: number;
  gray: number;
  /** Shows nothing, not "No evidence yet", when there are no results. */
  quiet?: boolean;
}>();
</script>

<template>
  <Cluster v-if="green + red + gray" gap="1">
    <StatusBadge v-if="green" status="satisfied" :count="green" compact />
    <StatusBadge v-if="red" status="not-satisfied" :count="red" compact />
    <StatusBadge v-if="gray" status="unknown" :count="gray" compact />
  </Cluster>
  <Text v-else-if="!quiet" variant="caption">No evidence yet.</Text>
</template>
