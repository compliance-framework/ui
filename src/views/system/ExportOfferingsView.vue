<template>
  <ExportOfferingsPanel v-if="sspId" :ssp-id="sspId" />
  <Message v-else severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">System Security Plan not selected</h4>
      <p>Select a system security plan to manage its export offerings.</p>
    </div>
  </Message>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Message from '@/volt/Message.vue';
import ExportOfferingsPanel from '@/components/system-security-plans/ExportOfferingsPanel.vue';
import { useSystemStore } from '@/stores/system.ts';

// The System tab's host: same panel as the SSP-editor route, but scoped to the *selected*
// SSP rather than a route param.
const systemStore = useSystemStore();
const sspId = computed(() => systemStore.system.securityPlan?.uuid ?? '');
</script>
