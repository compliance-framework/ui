<template>
  <div>
    <PageHeader>Edit Assessment Results</PageHeader>

    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="text-gray-500 dark:text-slate-400">Loading...</div>
    </div>
    <div
      v-else-if="error"
      class="flex justify-center items-center min-h-screen"
    >
      <div class="text-red-500">Error: {{ error }}</div>
    </div>
    <div
      v-else
      class="my-4 p-6 bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg shadow"
    >
      <form @submit.prevent="updateAssessmentResults">
        <div class="grid grid-cols-1 gap-6">
          <!-- Title -->
          <div>
            <label
              for="title"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Title <span class="text-red-500">*</span>
            </label>
            <input
              id="title"
              v-model="formData.metadata.title"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>

          <!-- Version -->
          <div>
            <label
              for="version"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Version <span class="text-red-500">*</span>
            </label>
            <input
              id="version"
              v-model="formData.metadata.version"
              type="text"
              required
              placeholder="1.0.0"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>

          <!-- Published Date -->
          <div>
            <label
              for="published"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Published Date
            </label>
            <input
              id="published"
              v-model="publishedDate"
              type="datetime-local"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>

          <!-- Remarks -->
          <div>
            <label
              for="remarks"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Remarks
            </label>
            <textarea
              id="remarks"
              v-model="formData.metadata.remarks"
              rows="4"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>

          <!-- Import AP -->
          <div class="border-t pt-6">
            <h3
              class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4"
            >
              Import Assessment Plan
            </h3>

            <div>
              <label
                for="importApHref"
                class="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Href <span class="text-red-500">*</span>
              </label>
              <input
                id="importApHref"
                v-model="formData.importAp.href"
                type="text"
                required
                placeholder="#assessment-plan-uuid"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>

            <div class="mt-4">
              <label
                for="importApRemarks"
                class="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Import AP Remarks
              </label>
              <textarea
                id="importApRemarks"
                v-model="formData.importAp.remarks"
                rows="3"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-4 pt-6 border-t">
            <RouterLink
              :to="`/assessment-results/${assessmentResultsId}`"
              class="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Cancel
            </RouterLink>
            <button
              type="submit"
              :disabled="updating"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Updating...' : 'Update Assessment Results' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import type { AssessmentResults } from '@/stores/assessment-results';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const assessmentResultsId = route.params.id as string;
const error = ref<string | null>(null);

const formData = ref({
  uuid: '',
  metadata: {
    title: '',
    version: '',
    published: '',
    lastModified: '',
    oscalVersion: '1.1.3',
    remarks: '',
  },
  importAp: {
    href: '',
    remarks: '',
  },
  results: [] as any[],
});

const {
  data: ar,
  execute: executeLoad,
  isLoading: loading,
} = useDataApi<AssessmentResults>(
  `/api/oscal/assessment-results/${assessmentResultsId}`,
  null,
  { immediate: false },
);
const { execute: executeUpdate, isLoading: updating } =
  useDataApi<AssessmentResults>(
    `/api/oscal/assessment-results/${assessmentResultsId}`,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

// Computed property for datetime-local input
const publishedDate = computed({
  get: () => {
    if (!formData.value.metadata.published) return '';
    return new Date(formData.value.metadata.published)
      .toISOString()
      .slice(0, 16);
  },
  set: (value: string) => {
    formData.value.metadata.published = value
      ? new Date(value).toISOString()
      : '';
  },
});

async function loadAssessmentResults() {
  try {
    await executeLoad();
    if (!ar.value) {
      throw new Error('Assessment Results not found');
    }

    formData.value = {
      uuid: ar.value.uuid,
      metadata: {
        title: ar.value.metadata?.title || '',
        version: ar.value.metadata?.version || '',
        published: ar.value.metadata?.published || '',
        lastModified: ar.value.metadata?.lastModified || '',
        oscalVersion: ar.value.metadata?.oscalVersion || '1.1.3',
        remarks: ar.value.metadata?.remarks || '',
      },
      importAp: {
        href: ar.value.importAp?.href || '',
        remarks: ar.value.importAp?.remarks || '',
      },
      results: ar.value.results || [],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = errorMessage;
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: `Failed to load Assessment Results: ${errorMessage}`,
      life: 3000,
    });
  }
}

async function updateAssessmentResults() {
  try {
    await executeUpdate({
      data: formData.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Assessment Results updated successfully',
      life: 3000,
    });

    router.push(`/assessment-results/${assessmentResultsId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to update Assessment Results: ${errorMessage}`,
      life: 5000,
    });
  }
}

onMounted(() => {
  loadAssessmentResults();
});
</script>
