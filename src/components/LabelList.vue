<template>
  <div class="flex items-center flex-wrap">
    <div
      v-for="label of sortedLabels"
      :key="label"
      class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 m-1 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1"
    >
      {{ label }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { EvidenceLabel } from '@/stores/evidence.ts'

const { labels, excludeKeys } = defineProps({
  labels: {
    type: Array,
    required: true,
  },
  excludeKeys: {
    type: Array,
    default() {
      return [];
    },
  },
});

const sortedLabels = computed(() => {
  const localLabels = labels as EvidenceLabel[];
  return localLabels.filter((label: EvidenceLabel) => {
      return (
        label.name.substring(0, 1) != '_' &&
        !excludeKeys.includes(label.name)
      );
    })
    .map((label: EvidenceLabel) => `${label.name}=${label.value}`)
    .sort((a, b) => (a > b ? -1 : 0));
});
</script>
