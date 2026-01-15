<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import axios from 'axios';
import { useConfigStore } from '@/stores/config';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Message from '@/volt/Message.vue';

const configStore = useConfigStore();
const toast = useToast();
const apiUrl = ref<string>('');

onMounted(async () => {
  const config = await configStore.getConfig();
  apiUrl.value = config.API_URL;
});

interface ImportFileResult {
  filename: string;
  success: boolean;
  message: string;
  type?: string;
  title?: string;
  count?: number;
}

interface ImportResponse {
  total_files: number;
  successful_count: number;
  failed_count: number;
  total_dashboards?: number;
  results: ImportFileResult[];
}

const oscalFiles = ref<File[]>([]);
const dashboardFiles = ref<File[]>([]);
const oscalUploading = ref(false);
const dashboardUploading = ref(false);
const oscalResults = ref<ImportResponse | null>(null);
const dashboardResults = ref<ImportResponse | null>(null);

const oscalFileInput = ref<HTMLInputElement>();
const dashboardFileInput = ref<HTMLInputElement>();

const onOscalFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    oscalFiles.value = Array.from(target.files);
  }
};

const onDashboardFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    dashboardFiles.value = Array.from(target.files);
  }
};

const uploadOscalFiles = async () => {
  if (oscalFiles.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No Files',
      detail: 'Please select at least one OSCAL file to import',
      life: 3000,
    });
    return;
  }

  oscalUploading.value = true;
  oscalResults.value = null;

  try {
    const formData = new FormData();
    oscalFiles.value.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axios.post<{ data: ImportResponse }>(
      `${apiUrl.value}/api/oscal/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      },
    );

    oscalResults.value = response.data.data;

    if (response.data.data.successful_count > 0) {
      toast.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `Successfully imported ${response.data.data.successful_count} of ${response.data.data.total_files} file(s)`,
        life: 5000,
      });
    }

    if (response.data.data.failed_count > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Import',
        detail: `${response.data.data.failed_count} file(s) failed to import`,
        life: 5000,
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        : undefined;
    toast.add({
      severity: 'error',
      summary: 'Import Failed',
      detail: errorMessage || 'Failed to import OSCAL files',
      life: 5000,
    });
  } finally {
    oscalUploading.value = false;
  }
};

const uploadDashboardFiles = async () => {
  if (dashboardFiles.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No Files',
      detail: 'Please select at least one dashboard file to import',
      life: 3000,
    });
    return;
  }

  dashboardUploading.value = true;
  dashboardResults.value = null;

  try {
    const formData = new FormData();
    dashboardFiles.value.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axios.post<{ data: ImportResponse }>(
      `${apiUrl.value}/api/filters/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      },
    );

    dashboardResults.value = response.data.data;

    if (response.data.data.successful_count > 0) {
      toast.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `Successfully imported ${response.data.data.total_dashboards} dashboard(s) from ${response.data.data.successful_count} file(s)`,
        life: 5000,
      });
    }

    if (response.data.data.failed_count > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Import',
        detail: `${response.data.data.failed_count} file(s) failed to import`,
        life: 5000,
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        : undefined;
    toast.add({
      severity: 'error',
      summary: 'Import Failed',
      detail: errorMessage || 'Failed to import dashboard files',
      life: 5000,
    });
  } finally {
    dashboardUploading.value = false;
  }
};

const clearOscalFiles = () => {
  oscalFiles.value = [];
  oscalResults.value = null;
  if (oscalFileInput.value) {
    oscalFileInput.value.value = '';
  }
};

const clearDashboardFiles = () => {
  dashboardFiles.value = [];
  dashboardResults.value = null;
  if (dashboardFileInput.value) {
    dashboardFileInput.value.value = '';
  }
};
</script>

<template>
  <PageHeader>Import Data</PageHeader>
  <div class="mt-8">
    <p class="text-gray-600 dark:text-gray-400 mb-6">
      Import OSCAL content and dashboards from JSON files
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- OSCAL Import Section -->
      <PageCard>
        <template #header>
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span>📄</span>
            <span>Import OSCAL Content</span>
          </h3>
        </template>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Import OSCAL documents including catalogs, profiles, system security
            plans, assessment plans, assessment results, component definitions,
            and POA&Ms.
          </p>

          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center"
          >
            <input
              type="file"
              ref="oscalFileInput"
              @change="onOscalFileSelect"
              accept=".json"
              multiple
              class="hidden"
            />
            <div class="flex flex-col items-center justify-center">
              <span class="text-4xl mb-3">☁️</span>
              <p class="text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop OSCAL JSON files here or
              </p>
              <button
                type="button"
                @click="oscalFileInput?.click()"
                class="text-blue-600 hover:text-blue-700 underline"
              >
                click to browse
              </button>
            </div>
          </div>

          <div
            v-if="oscalFiles.length > 0"
            class="text-sm text-gray-600 dark:text-gray-400"
          >
            Selected {{ oscalFiles.length }} file(s)
          </div>

          <div class="flex gap-2">
            <PrimaryButton
              @click="uploadOscalFiles"
              :disabled="oscalFiles.length === 0 || oscalUploading"
            >
              {{ oscalUploading ? 'Importing...' : 'Import' }}
            </PrimaryButton>
            <SecondaryButton
              @click="clearOscalFiles"
              :disabled="oscalFiles.length === 0"
            >
              Clear
            </SecondaryButton>
          </div>

          <!-- Results -->
          <div v-if="oscalResults" class="mt-4">
            <hr class="my-4 border-gray-200 dark:border-gray-700" />
            <h3 class="font-semibold mb-3">Import Results</h3>
            <div class="space-y-2">
              <Message
                v-for="result in oscalResults.results"
                :key="result.filename"
                :severity="result.success ? 'success' : 'error'"
              >
                <div class="flex-1">
                  <p class="font-medium text-sm">{{ result.filename }}</p>
                  <p class="text-xs mt-1">
                    {{ result.message }}
                  </p>
                  <p
                    v-if="result.type && result.title"
                    class="text-xs mt-1 opacity-75"
                  >
                    {{ result.type }}: {{ result.title }}
                  </p>
                </div>
              </Message>
            </div>
          </div>
        </div>
      </PageCard>

      <!-- Dashboard Import Section -->
      <PageCard>
        <template #header>
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span>📊</span>
            <span>Import Dashboards</span>
          </h3>
        </template>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Import dashboard configurations with filters and control
            associations.
          </p>

          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center"
          >
            <input
              type="file"
              ref="dashboardFileInput"
              @change="onDashboardFileSelect"
              accept=".json"
              multiple
              class="hidden"
            />
            <div class="flex flex-col items-center justify-center">
              <span class="text-4xl mb-3">☁️</span>
              <p class="text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop dashboard JSON files here or
              </p>
              <button
                type="button"
                @click="dashboardFileInput?.click()"
                class="text-blue-600 hover:text-blue-700 underline"
              >
                click to browse
              </button>
            </div>
          </div>

          <div
            v-if="dashboardFiles.length > 0"
            class="text-sm text-gray-600 dark:text-gray-400"
          >
            Selected {{ dashboardFiles.length }} file(s)
          </div>

          <div class="flex gap-2">
            <PrimaryButton
              @click="uploadDashboardFiles"
              :disabled="dashboardFiles.length === 0 || dashboardUploading"
            >
              {{ dashboardUploading ? 'Importing...' : 'Import' }}
            </PrimaryButton>
            <SecondaryButton
              @click="clearDashboardFiles"
              :disabled="dashboardFiles.length === 0"
            >
              Clear
            </SecondaryButton>
          </div>

          <!-- Results -->
          <div v-if="dashboardResults" class="mt-4">
            <hr class="my-4 border-gray-200 dark:border-gray-700" />
            <h3 class="font-semibold mb-3">Import Results</h3>
            <div class="space-y-2">
              <Message
                v-for="result in dashboardResults.results"
                :key="result.filename"
                :severity="result.success ? 'success' : 'error'"
              >
                <div class="flex-1">
                  <p class="font-medium text-sm">{{ result.filename }}</p>
                  <p class="text-xs mt-1">
                    {{ result.message }}
                  </p>
                  <p v-if="result.count" class="text-xs mt-1 opacity-75">
                    Imported {{ result.count }} dashboard(s)
                  </p>
                </div>
              </Message>
            </div>
          </div>
        </div>
      </PageCard>
    </div>
  </div>
</template>
