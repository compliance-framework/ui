<template>
  <div class="p-4">
    <DiagramsView :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DiagramsView from '@/views/system/DiagramsView.vue';

const route = useRoute();
const sspId = computed(() => String(route.params.id || ''));
</script>
