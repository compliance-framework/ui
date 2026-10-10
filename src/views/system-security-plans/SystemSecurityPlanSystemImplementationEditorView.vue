<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
  >
    <SystemImplementationOverviewForm
      :ssp-id="sspId"
      :system-implementation="systemImplementation!"
      @saved="handleOverviewSaved"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SystemImplementationOverviewForm from '@/components/system-security-plans/SystemImplementationOverviewForm.vue';
import type { SystemImplementation } from '@/oscal';
import { useDataApi } from '@/composables/axios';

const props = defineProps<{ sspId?: string }>();
const route = useRoute();
const sspId = computed(() => props.sspId || String(route.params.id || ''));

const { data: systemImplementation } = useDataApi<SystemImplementation>(
  `/api/oscal/system-security-plans/${sspId.value}/system-implementation`,
);

const handleOverviewSaved = (
  updatedSystemImplementation: SystemImplementation,
) => {
  systemImplementation.value = updatedSystemImplementation;
};
</script>
