<template>
  <slot name="img" v-if="resource.base64?.mediaType.startsWith('image/')">
    <img
      :src="`data:${resource.base64.mediaType};base64,${resource.base64.value}`"
      :alt="resource.title"
      class="w-full h-auto"
    />
  </slot>
</template>
<script lang="ts" setup>
import type { BackMatterResource } from '@/oscal';

const { resource } = defineProps<{
  resource: BackMatterResource;
}>();
</script>
