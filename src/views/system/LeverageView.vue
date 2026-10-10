<template>
  <SystemSecurityPlanLeverageView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanLeverageView from '@/views/system-security-plans/SystemSecurityPlanLeverageView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
