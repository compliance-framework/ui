<template>
  <SystemSecurityPlanCharacteristicsView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanCharacteristicsView from '@/views/system-security-plans/SystemSecurityPlanCharacteristicsView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
