<template>
  <div class="p-4">
    <SystemUsersPanel v-if="sspId" :ssp-id="sspId" />
  </div>
</template>

<script setup lang="ts">
import SystemUsersPanel from '@/components/system-security-plans/SystemUsersPanel.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
