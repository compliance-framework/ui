<template>
  <div
    role="alert"
    class="min-h-[120px] rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    data-test="code-editor-error"
  >
    The editor failed to load. Reload the page to try again.
  </div>
</template>

<script setup lang="ts">
// Shown when the CodeMirror chunk cannot be loaded (e.g. stale chunk hashes after a deploy).
defineProps<{ error?: Error }>();
</script>
