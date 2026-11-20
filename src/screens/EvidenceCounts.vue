<script setup lang="ts">
/**
 * Evidence results as one capsule: how many are satisfied, unknown and not satisfied, or a
 * caption when there are none (or nothing, with `quiet`). Shared by the Implementation list and
 * component evidence; the catalog tree draws the same counts.
 */
import StatusCapsule from '@/ds/components/StatusCapsule/StatusCapsule.vue';
import Text from '@/ds/components/Text/Text.vue';

defineProps<{
  green: number;
  red: number;
  gray: number;
  /** Shows nothing, not "No evidence yet", when there are no results. */
  quiet?: boolean;
}>();
</script>

<template>
  <StatusCapsule
    v-if="green + red + gray"
    :segments="[
      { status: 'satisfied', count: green },
      { status: 'unknown', count: gray },
      { status: 'not-satisfied', count: red },
    ]"
  />
  <Text v-else-if="!quiet" variant="caption">No evidence yet.</Text>
</template>
