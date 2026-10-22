<template>
  <ScopePanel :ssp-id="sspId" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ScopePanel from '@/components/system-security-plans/ScopePanel.vue';
import { getIdFromRoute } from '@/utils/get-id-from-route';

const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) || '');
</script>
