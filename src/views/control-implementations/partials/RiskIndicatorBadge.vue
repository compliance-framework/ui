<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  componentId: string;
  controlId: string;
  riskCount: number;
  highestSeverity?: 'high' | 'medium' | 'low';
}>();

const badgeColor = computed(() => {
  if (!props.highestSeverity || props.riskCount === 0)
    return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';

  switch (props.highestSeverity) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
  }
});

const tooltipText = computed(() => {
  if (props.riskCount === 0) return 'No risks';
  if (props.riskCount === 1) return '1 risk associated';
  return `${props.riskCount} risks associated`;
});
</script>

<template>
  <span
    v-if="riskCount > 0"
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      badgeColor,
    ]"
    :title="tooltipText"
    :aria-label="tooltipText"
  >
    ⚠️ {{ riskCount }}
  </span>
</template>
