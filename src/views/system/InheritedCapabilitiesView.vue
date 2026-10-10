<template>
  <SystemSecurityPlanInheritedCapabilitiesView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanInheritedCapabilitiesView from '@/views/system-security-plans/SystemSecurityPlanInheritedCapabilitiesView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
