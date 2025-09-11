<template>
  <label class="pb-2 dark:text-slate-300">
    <slot></slot>
    <span v-if="props.required" class="ml-1 text-red-500">*</span>
  </label>
</template>

<script setup lang="ts">
const props = defineProps<{
  required?: boolean;
}>();
</script>
