<script setup lang="ts">
withDefaults(
  defineProps<{
    inputId: string;
    label: string;
    required?: boolean;
  }>(),
  {
    required: false,
  },
);
</script>

<template>
  <div class="space-y-1">
    <label
      :for="inputId"
      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-bold uppercase leading-none tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
    >
      {{ label
      }}<span v-if="required" class="text-[var(--ui-v2-error)]"> *</span>
    </label>

    <slot :input-id="inputId" />
  </div>
</template>
