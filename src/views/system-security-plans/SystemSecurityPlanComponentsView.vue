<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
  >
    <ComponentsPanel :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ComponentsPanel from '@/components/system-security-plans/ComponentsPanel.vue';
import { getIdFromRoute } from '@/utils/get-id-from-route';

const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) || '');
</script>
