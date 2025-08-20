<template>
  <div>
    <PageHeader>Create Assessment Results</PageHeader>

    <div
      class="my-4 p-6 bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg shadow"
    >
      <form @submit.prevent="createAssessmentResults">
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

          <!-- Import AP (Href) -->
          <div>
            <label
              for="importApHref"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Import Assessment Plan (Href) <span class="text-red-500">*</span>
            </label>
            <input
              id="importApHref"
              v-model="formData.importAp.href"
              type="text"
              required
              placeholder="#assessment-plan-uuid"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Reference to the assessment plan UUID (e.g.,
              #uuid-of-assessment-plan)
            </p>
          </div>

          <!-- Import AP Remarks -->
          <div>
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

          <!-- Initial Result -->
          <div class="border-t pt-6">
            <h3
              class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4"
            >
              Initial Result
            </h3>

            <!-- Result Title -->
            <div>
              <label
                for="resultTitle"
                class="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Result Title <span class="text-red-500">*</span>
              </label>
              <input
                id="resultTitle"
                v-model="formData.result.title"
                type="text"
                required
                placeholder="Initial Assessment Result"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>

            <!-- Result Description -->
            <div class="mt-4">
              <label
                for="resultDescription"
                class="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Result Description <span class="text-red-500">*</span>
              </label>
              <textarea
                id="resultDescription"
                v-model="formData.result.description"
                rows="3"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-4 pt-6 border-t">
            <RouterLink
              to="/assessment-results"
              class="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Cancel
            </RouterLink>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Creating...' : 'Create Assessment Results' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import type { AssessmentResults } from '@/stores/assessment-results.ts';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const router = useRouter();
const toast = useToast();

const formData = ref({
  uuid: uuidv4(),
  metadata: {
    title: '',
    version: '',
    published: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    oscalVersion: '1.1.3',
  },
  importAp: {
    href: '',
    remarks: '',
  },
  result: {
    uuid: uuidv4(),
    title: '',
    description: '',
    start: new Date().toISOString(),
    reviewedControls: {
      controlSelections: [
        {
          includeAll: {},
        },
      ],
    },
  },
  results: [] as any[],
});

const {
  data: newAR,
  isLoading: loading,
  execute: executeCreate,
} = useDataApi<AssessmentResults>(
  '/api/oscal/assessment-results',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function createAssessmentResults() {
  try {
    // Prepare the assessment results object
    const assessmentResults = {
      ...formData.value,
      results: [formData.value.result],
    };

    // Remove the temporary result field
    delete (assessmentResults as any).result;

    await executeCreate({
      data: assessmentResults,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Assessment Results created successfully',
      life: 3000,
    });

    // Navigate to the created assessment results
    router.push(`/assessment-results/${newAR.value!.uuid}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to create Assessment Results: ${errorMessage}`,
      life: 5000,
    });
  }
}
</script>
