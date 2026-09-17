<template>
  <div class="p-4">
    <ComponentsPanel
      :ssp-id="sspId"
      dashboard-route-name="system-component-dashboards"
      dashboard-close-path="/system/components"
    />
  </div>
</template>

<script setup lang="ts">
import ComponentsPanel from '@/components/system-security-plans/ComponentsPanel.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
