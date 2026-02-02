<template>
  <div v-if="store.definition" class="space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          JSON View
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Raw JSON representation of this workflow definition
        </p>
      </div>
      <div class="flex gap-2">
        <SecondaryButton @click="copyToClipboard">
          <i class="pi pi-copy mr-2"></i>
          Copy
        </SecondaryButton>
        <SecondaryButton @click="downloadJSON">
          <i class="pi pi-download mr-2"></i>
          Download
        </SecondaryButton>
      </div>
    </div>

    <!-- JSON Content -->
    <div
      class="border rounded-lg bg-gray-900 text-gray-100 p-4 overflow-auto max-h-[600px]"
    >
      <pre class="text-sm font-mono whitespace-pre-wrap">{{
        formattedJSON
      }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useToast } from 'primevue/usetoast';
import SecondaryButton from '@/volt/SecondaryButton.vue';

const store = useWorkflowDefinitionStore();
const toast = useToast();

const exportData = computed(() => {
  if (!store.definition) return null;

  return {
    definition: store.definition,
    steps: store.steps,
  };
});

const formattedJSON = computed(() => {
  if (!exportData.value) return '';
  return JSON.stringify(exportData.value, null, 2);
});

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(formattedJSON.value);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'JSON copied to clipboard',
      life: 3000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail: 'Failed to copy to clipboard',
      life: 3000,
    });
  }
}

function downloadJSON() {
  if (!store.definition) return;

  const blob = new Blob([formattedJSON.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflow-definition-${store.definition.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.add({
    severity: 'success',
    summary: 'Downloaded',
    detail: 'JSON file downloaded',
    life: 3000,
  });
}
</script>
