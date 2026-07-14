<template>
  <ExportOfferingsPanel :ssp-id="sspId" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ExportOfferingsPanel from '@/components/system-security-plans/ExportOfferingsPanel.vue';
import { getIdFromRoute } from '@/utils/get-id-from-route';

// The SSP-editor route's host for the offerings surface: it only resolves which SSP, the
// panel does the rest. The System tab (system:export-offerings) renders the same panel
// against the selected SSP.
const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) ?? '');
</script>
