<template>
  <div class="p-4">
    <SystemSecurityPlanOverviewView
      :ssp-id="sspId"
      risk-list-route-name="system:risks"
      compliance-route-name="system:compliance"
    />
  </div>
</template>

<script setup lang="ts">
import SystemSecurityPlanOverviewView from '@/views/system-security-plans/SystemSecurityPlanOverviewView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
