<template>
  <div v-for="(value, label) of labels" :key="label" class="inline-block bg-blue-100 border border-blue-200 m-1 text-gray-800 rounded-full text-sm px-2 py-0.5">
    {{label}}={{value}}
  </div>
</template>
<script setup lang="ts">
defineProps<{
  labels: {
    [label: string]: string
  }
}>()
</script>
