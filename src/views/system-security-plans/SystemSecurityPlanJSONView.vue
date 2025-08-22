<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold dark:text-slate-300">
          Full System Security Plan JSON
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
          Loading full system security plan...
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
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config.ts';

const route = useRoute();
const configStore = useConfigStore();
const toast = useToast();

const sspId = ref<string>(route.params.id as string);
const sspData = ref<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

const formattedJSON = computed(() => {
  if (!sspData.value) return '';
  return JSON.stringify(sspData.value, null, 2);
});

onMounted(async () => {
  await loadSystemSecurityPlan();
});

async function loadSystemSecurityPlan() {
  try {
    loading.value = true;
    error.value = null;

    // Get raw API response without camelCase conversion
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/system-security-plans/${sspId.value}/full`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw response;
    }
    sspData.value = await response.json();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Loading JSON',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to load system security plan JSON. Please try again.',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function downloadJSON() {
  if (!sspData.value) return;

  try {
    const jsonData = JSON.stringify(sspData.value, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sspData.value.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'system-security-plan'}-full.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: 'System security plan JSON downloaded successfully',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to download system security plan JSON',
      life: 3000,
    });
  }
}

async function copyToClipboard() {
  if (!sspData.value) return;

  try {
    const jsonData = JSON.stringify(sspData.value, null, 2);
    await navigator.clipboard.writeText(jsonData);

    toast.add({
      severity: 'success',
      summary: 'Copied to Clipboard',
      detail: 'System security plan JSON copied to clipboard',
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
