<script setup lang="ts">
import SecondaryButton from '@/volt/SecondaryButton.vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';

defineProps<{
  label: string;
}>();
</script>

<template>
  <SecondaryButton
    class="!h-auto !px-3 !py-1.5 !text-[10px]"
    type="button"
    size="small"
  >
    <span class="inline-flex items-center gap-1.5">
      <V2LucideIcon name="plus" :size="12" />
      <span>{{ label }}</span>
    </span>
  </SecondaryButton>
</template>
