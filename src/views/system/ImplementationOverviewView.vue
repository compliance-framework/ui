<template>
  <SystemSecurityPlanSystemImplementationEditorView :ssp-id="sspId" />
</template>

<script setup lang="ts">
import SystemSecurityPlanSystemImplementationEditorView from '@/views/system-security-plans/SystemSecurityPlanSystemImplementationEditorView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';

const sspId = useActiveSspId();
</script>
