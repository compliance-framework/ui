<template>
  <SystemSecurityPlanJSONView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanJSONView from '@/views/system-security-plans/SystemSecurityPlanJSONView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
