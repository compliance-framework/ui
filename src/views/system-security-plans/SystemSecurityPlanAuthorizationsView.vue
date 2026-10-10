<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
  >
    <LeveragedAuthorizationsPanel :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import LeveragedAuthorizationsPanel from '@/components/system-security-plans/LeveragedAuthorizationsPanel.vue';
import { getIdFromRoute } from '@/utils/get-id-from-route';

const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) || '');
</script>
