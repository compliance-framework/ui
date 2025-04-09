<template>
  <textarea v-model="model" class="w-full px-4 py-2 rounded-md border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-300 disabled:dark:text-slate-500 disabled:dark:bg-slate-800 outline-none focus:border-slate-500 disabled:cursor-not-allowed" />
</template>

<script setup lang="ts">
const model = defineModel()
</script>
