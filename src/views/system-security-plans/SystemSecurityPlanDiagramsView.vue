<template>
  <div class="p-4">
    <!-- Keyed so moving between SSPs in the editor remounts it instead of reusing the
         KeepAlive instance that is bound to the previous id. -->
    <DiagramsView :key="sspId" :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DiagramsView from '@/views/system/DiagramsView.vue';

const route = useRoute();
const sspId = computed(() => String(route.params.id || ''));
</script>
