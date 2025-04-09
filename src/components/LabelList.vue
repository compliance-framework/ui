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

const { labels, excludeKeys } = defineProps({
  labels: {
    type: Object,
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
  return Object.entries(labels)
    .filter(([key]) => {
      return (
        key.substring(0, 1) != '_' &&
        !['_policy_path', '_agent'].includes(key) &&
        !excludeKeys.includes(key)
      );
    })
    .map(([key, value]) => `${key}=${value}`)
    .sort((a, b) => (a > b ? -1 : 0));
});
</script>
