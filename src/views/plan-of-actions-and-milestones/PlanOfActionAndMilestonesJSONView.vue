<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">
        POAM JSON View
      </h2>
      <button
        @click="downloadJson"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Download JSON
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading POAM data...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading POAM data: {{ error }}</p>
    </div>

    <div
      v-else
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
    >
      <pre
        class="p-4 overflow-auto text-sm text-gray-900 dark:text-slate-300 bg-gray-50 dark:bg-slate-800"
        >{{ formattedJson }}</pre
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { POAM } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import decamelizeKeys from 'decamelize-keys';

const route = useRoute();
const toast = useToast();

const {
  data: poamData,
  isLoading: loading,
  error,
} = useDataApi<POAM>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}/full`,
);

const formattedJson = computed(() => {
  if (!poamData.value) return '';
  return JSON.stringify(
    decamelizeKeys(poamData.value, { separator: '-', deep: true }),
    null,
    2,
  );
});

async function downloadJson(): Promise<void> {
  if (!poamData.value) return;

  try {
    const dataBlob = new Blob([formattedJson.value], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${poamData.value.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'poam'}-poam.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download JSON: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
