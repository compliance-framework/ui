<script setup lang="ts">
defineProps({
  title: String,
})
</script>
<template>
  <div class="text-zinc-500 font-semibold py-2 px-2">{{ title}}</div>
  <div class="mb-2 ml-4">
    <slot></slot>
  </div>
</template>
