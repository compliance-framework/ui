<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '../Button/Button.vue';
import InlineMessage from '../InlineMessage/InlineMessage.vue';
/** Embedded image inspection fits its content region and retains local load recovery. */
const props = defineProps<{ src: string; alt: string }>();
const failed = ref(false);
const attempt = ref(0);
watch(
  () => props.src,
  () => {
    failed.value = false;
    attempt.value = 0;
  },
);
function retry() {
  failed.value = false;
  attempt.value += 1;
}
</script>
<template>
  <InlineMessage v-if="failed" tone="error" title="Image is unavailable">
    The embedded image could not be displayed. Download the resource to inspect
    its bytes.
    <template #actions
      ><Button size="sm" @click="retry">Retry image</Button></template
    >
  </InlineMessage>
  <img
    v-else
    :key="attempt"
    class="image-preview"
    :src="src"
    :alt="alt"
    @error="failed = true"
  />
</template>
<style scoped>
.image-preview {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
  object-fit: contain;
}
</style>
