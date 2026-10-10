<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
  >
    <SystemUsersPanel :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SystemUsersPanel from '@/components/system-security-plans/SystemUsersPanel.vue';
import { getIdFromRoute } from '@/utils/get-id-from-route';

const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) || '');
</script>
