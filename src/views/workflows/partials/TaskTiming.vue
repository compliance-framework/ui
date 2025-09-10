<template>
  <Chip v-if="props.timing.atFrequency">
    <BIconClock /> Every {{ props.timing.atFrequency.period }}
    {{ props.timing.atFrequency.unit }}
  </Chip>
</template>

<script setup lang="ts">
import type { TaskTiming } from '@/oscal';
import Chip from '@/volt/Chip.vue';
import { BIconClock } from 'bootstrap-icons-vue';

const props = defineProps<{
  timing: TaskTiming;
}>();
</script>
