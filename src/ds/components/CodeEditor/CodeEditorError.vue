<script setup lang="ts">
/** Shown when the CodeMirror chunk cannot be loaded (e.g. stale chunk hashes after a deploy). */
import InlineMessage from '../InlineMessage/InlineMessage.vue';

defineProps<{ error?: Error }>();
</script>

<template>
  <InlineMessage
    tone="error"
    title="The editor failed to load"
    data-test="code-editor-error"
  >
    Reload the page to try again.
  </InlineMessage>
</template>
