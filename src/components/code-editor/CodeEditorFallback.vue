<template>
  <div
    class="min-h-[120px] rounded-md border border-ccf-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-900"
    aria-busy="true"
    data-test="code-editor-loading"
  />
</template>

<script setup lang="ts">
// Placeholder shown while the CodeMirror chunk loads. Vue renders a loadingComponent
// without props, so it cannot show the document.
</script>
