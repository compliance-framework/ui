<template>
  <div class="p-4">
    <ScopePanel :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import ScopePanel from '@/components/system-security-plans/ScopePanel.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
