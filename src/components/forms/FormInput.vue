<template>
  <input
    v-model="model"
    v-bind="$attrs"
    class="w-full px-4 py-2 rounded-md border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-300 disabled:text-zinc-500 disabled:bg-neutral-100 disabled:dark:text-slate-400 disabled:dark:bg-slate-800 outline-none focus:border-slate-500 disabled:cursor-not-allowed"
  />
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const model = defineModel();
</script>
