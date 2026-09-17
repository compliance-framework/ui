<template>
  <SystemSecurityPlanControlImplementationView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanControlImplementationView from '@/views/system-security-plans/SystemSecurityPlanControlImplementationView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
