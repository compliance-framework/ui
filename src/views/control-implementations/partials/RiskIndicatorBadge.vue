<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  riskCount: number;
  isCapped?: boolean;
  highestSeverity?: 'high' | 'medium' | 'low';
}>();

const displayCount = computed(() =>
  props.isCapped && props.riskCount >= 100 ? '99+' : `${props.riskCount}`,
);

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
  if (displayCount.value === '1') return '1 risk associated';
  return `${displayCount.value} risks associated`;
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
    ⚠️ {{ displayCount }}
  </span>
</template>
