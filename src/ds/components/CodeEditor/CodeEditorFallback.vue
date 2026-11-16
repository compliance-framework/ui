<script setup lang="ts">
/**
 * Placeholder shown while the CodeMirror chunk loads. Vue renders a loadingComponent without
 * props, so it cannot show the document.
 */
</script>

<template>
  <div
    class="code-editor-fallback"
    aria-busy="true"
    data-test="code-editor-loading"
  />
</template>

<style scoped>
.code-editor-fallback {
  min-height: calc(var(--ds-space-12) * 2.5);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
}
</style>
