<template>
  <div class="p-4">
    <LeveragedAuthorizationsPanel v-if="sspId" :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import LeveragedAuthorizationsPanel from '@/components/system-security-plans/LeveragedAuthorizationsPanel.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
