<script setup lang="ts">
defineProps({
  title: String,
})
</script>
<template>
  <div class="text-zinc-500 dark:text-slate-400 py-2 pl-8">{{ title}}</div>
  <div class="mb-2">
    <slot></slot>
  </div>
</template>
