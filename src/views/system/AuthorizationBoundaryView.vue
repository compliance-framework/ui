<template>
  <div class="p-4">
    <DiagramsView :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import DiagramsView from '@/views/system/DiagramsView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
