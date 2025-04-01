<template>
  <div
    v-for="label of sortedLabels"
    :key="label"
    class="inline-block bg-blue-100 border border-blue-200 m-1 text-gray-800 rounded-full text-sm px-2 py-0.5"
  >
    {{ label }}
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
    }
  },
})

const sortedLabels = computed(() => {
  return Object
    .entries(labels)
    .filter(([key]) => {
      return !["_policy_path", "_agent"].includes(key) && !excludeKeys.includes(key)
    })
    .map(([key, value]) => key + ': ' + value)
    .sort((a, b) => a > b ? -1 : 0)
});
</script>
