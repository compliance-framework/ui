<template>
  <SystemSecurityPlanComplianceView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanComplianceView from '@/views/system-security-plans/SystemSecurityPlanComplianceView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
