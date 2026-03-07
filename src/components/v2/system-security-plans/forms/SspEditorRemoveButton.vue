<script setup lang="ts">
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';

defineProps<{
  label?: string;
  topPaddingClass?: string;
}>();
</script>

<template>
  <button
    type="button"
    :class="[
      'inline-flex items-center gap-1 self-start whitespace-nowrap font-[var(--ui-v2-font-secondary)] text-[9px] font-bold uppercase tracking-[0.5px] text-[var(--ui-v2-error)]',
      topPaddingClass || 'pt-6',
    ]"
  >
    <V2LucideIcon name="trash-2" :size="12" />
    <span>{{ label || 'REMOVE' }}</span>
  </button>
</template>
