<template>
  <NoActiveSystem v-if="!sspId" subject="compliance posture" />
  <div v-else>
    <PageHeader>Compliance</PageHeader>
    <PageSubHeader>
      How {{ systemTitle }} measures up against its profiles
    </PageSubHeader>
    <SystemSecurityPlanComplianceView
      :ssp-id="sspId"
      attach-profile-route-name="controls:index"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import NoActiveSystem from '@/components/system/NoActiveSystem.vue';
import SystemSecurityPlanComplianceView from '@/views/system-security-plans/SystemSecurityPlanComplianceView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';
import { useSystemStore } from '@/stores/system';

const sspId = useActiveSspId();
const systemStore = useSystemStore();
const systemTitle = computed(
  () => systemStore.system.securityPlan?.metadata?.title || 'this system',
);
</script>
