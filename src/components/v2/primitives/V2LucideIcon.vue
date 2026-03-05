<script setup lang="ts">
import { computed } from 'vue';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  X,
  type LucideProps,
} from 'lucide-vue-next';

type V2LucideName =
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'copy'
  | 'view'
  | 'x';

const props = withDefaults(
  defineProps<{
    name: V2LucideName;
    size?: number;
    strokeWidth?: number;
    absoluteStrokeWidth?: LucideProps['absoluteStrokeWidth'];
  }>(),
  {
    size: 16,
    strokeWidth: 2,
    absoluteStrokeWidth: false,
  },
);

const iconMap = {
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  copy: Copy,
  view: Eye,
  x: X,
} as const;

const icon = computed(() => iconMap[props.name]);
</script>

<template>
  <component
    :is="icon"
    :size="size"
    :stroke-width="strokeWidth"
    :absolute-stroke-width="absoluteStrokeWidth"
    aria-hidden="true"
  />
</template>
