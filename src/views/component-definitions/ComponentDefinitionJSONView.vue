<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold dark:text-slate-300">
          Full Component Definition JSON
        </h3>
        <div class="flex gap-2">
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            @click="downloadJSON"
            :disabled="loading"
          >
            Download JSON
          </button>
          <button
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            @click="copyToClipboard"
            :disabled="loading"
          >
            Copy JSON
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          Loading full component definition...
        </p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-500 dark:text-red-400">{{ error }}</p>
      </div>

      <div
        v-else
        class="border border-ccf-300 dark:border-slate-700 rounded-md"
      >
        <pre
          class="bg-gray-50 dark:bg-slate-800 p-4 rounded-md overflow-auto max-h-96 text-sm"
        ><code>{{ formattedJSON }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { type ComponentDefinition } from '@/oscal';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import decamelizeKeys from 'decamelize-keys';

const route = useRoute();
const toast = useToast();

const componentDefinitionId = ref<string>(route.params.id as string);

const {
  data: componentDefinition,
  isLoading: loading,
  error,
} = useDataApi<ComponentDefinition>(
  `/api/oscal/component-definitions/${componentDefinitionId.value}/full`,
  {},
  { immediate: true },
);

const formattedJSON = computed(() => {
  if (!componentDefinition.value) return '';
  return JSON.stringify(
    decamelizeKeys(componentDefinition.value, { separator: '-', deep: true }),
    null,
    2,
  );
});

async function downloadJSON() {
  if (!componentDefinition.value) return;

  try {
    const blob = new Blob([formattedJSON.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${componentDefinition.value.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'component-definition'}-full.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: 'Component definition JSON downloaded successfully',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to download component definition JSON',
      life: 3000,
    });
  }
}

async function copyToClipboard() {
  if (!componentDefinition.value) return;

  try {
    await navigator.clipboard.writeText(formattedJSON.value);

    toast.add({
      severity: 'success',
      summary: 'Copied to Clipboard',
      detail: 'Component definition JSON copied to clipboard',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to copy JSON to clipboard',
      life: 3000,
    });
  }
}
</script>
