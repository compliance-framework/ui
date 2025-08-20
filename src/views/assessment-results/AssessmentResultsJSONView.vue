<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">
        JSON View
      </h2>
      <button
        @click="downloadJson"
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
      >
        Download JSON
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">
        Loading full assessment results...
      </p>
    </div>
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading assessment results: {{ error }}</p>
    </div>
    <div
      v-else-if="jsonContent"
      class="bg-gray-900 rounded-lg p-4 overflow-x-auto"
    >
      <pre class="text-sm text-gray-300 font-mono">{{
        decamelizeKeys(jsonContent, { separator: '-', deep: true })
      }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue';
import { type AssessmentResults } from '@/stores/assessment-results';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import decamelizeKeys from 'decamelize-keys';

const props = defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true,
  },
});

const toast = useToast();

const {
  data: jsonContent,
  isLoading: loading,
  error,
} = useDataApi<AssessmentResults>(
  `/api/oscal/assessment-results/${props.assessmentResults.uuid}/full`,
);

async function downloadJson() {
  if (!jsonContent.value) return;
  try {
    const dataBlob = new Blob(
      [
        JSON.stringify(
          decamelizeKeys(jsonContent.value, { separator: '-', deep: true }),
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.assessmentResults.metadata?.title.replace(/[^a-zA-Z0-9]/g, '_')}-assessment-results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Download Successful',
      detail: 'Assessment Results JSON downloaded successfully',
      life: 3000,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download JSON: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
