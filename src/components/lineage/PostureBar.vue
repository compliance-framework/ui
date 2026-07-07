<script setup lang="ts">
import type { PostureSegment } from './nodeMeta';

// A stacked posture bar: one segment per non-empty bucket, width proportional to
// its share of the total. Each segment has a tooltip with its count and label
// (e.g. "5 need evidence"). Used for a control's cross-SSP breakdown and a
// structural node's control tally.
defineProps<{
  segments: PostureSegment[];
  total: number;
  /** Compact width for the tree row; full width for cards. */
  compact?: boolean;
}>();
</script>

<template>
  <div
    class="flex overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800"
    :class="compact ? 'h-1.5 w-20' : 'h-2 w-full'"
  >
    <div
      v-for="s in segments"
      :key="s.key"
      class="h-full"
      :class="s.class"
      :style="{ width: (s.count / total) * 100 + '%' }"
      v-tooltip.top="`${s.count} ${s.label}`"
    />
  </div>
</template>
