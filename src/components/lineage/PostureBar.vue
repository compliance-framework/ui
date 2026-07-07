<script lang="ts" setup>
import { computed } from 'vue';
import type { PostureSegment } from './nodeMeta';

// A stacked posture bar: one segment per non-empty bucket, width proportional to
// its share of the total. Used for a control's cross-SSP breakdown and a
// structural node's control tally.
const props = defineProps<{
  segments: PostureSegment[];
  total: number;
  /** Compact width for the tree row; full width for cards. */
  compact?: boolean;
}>();

// A SINGLE tooltip for the whole bar rather than one per segment: a bucket may be a
// sliver (1 of hundreds) that's impossible to hover. Lists every present category
// with its count and percentage.
const tooltip = computed(() =>
  props.segments
    .map(
      (s) =>
        `${s.count} ${s.label} (${props.total ? Math.round((s.count / props.total) * 100) : 0}%)`,
    )
    .join(' · '),
);
</script>

<template>
  <div
    class="flex overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800"
    :class="compact ? 'h-1.5 w-20' : 'h-2 w-full'"
    v-tooltip.top="tooltip"
    role="img"
    :aria-label="tooltip"
  >
    <div
      v-for="s in segments"
      :key="s.key"
      class="h-full"
      :class="s.class"
      :style="{ width: (s.count / total) * 100 + '%' }"
    />
  </div>
</template>
