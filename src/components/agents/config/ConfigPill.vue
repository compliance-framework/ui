<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="classes"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    severity?: 'success' | 'warn' | 'danger' | 'secondary' | 'info';
  }>(),
  { severity: 'secondary' },
);

const classes = computed(
  () =>
    ({
      success:
        'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
      warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
      secondary:
        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    })[props.severity],
);
</script>
