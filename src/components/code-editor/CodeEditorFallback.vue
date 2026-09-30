<template>
  <pre
    class="max-h-[480px] min-h-[120px] overflow-auto rounded-md border border-ccf-300 bg-gray-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
    >{{ modelValue ?? original ?? '' }}</pre
  >
</template>

<script setup lang="ts">
// Shown while the CodeMirror chunk loads.
defineProps<{ modelValue?: string; original?: string }>();
</script>
