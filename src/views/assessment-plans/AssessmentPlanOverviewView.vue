<template>
  <template v-if="assessmentPlan">
    <div
      class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
    >
      <div v-if="assessmentPlan.metadata">
        <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">Metadata</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >Title</label
            >
            <p class="text-gray-900 dark:text-slate-300">
              {{ assessmentPlan.metadata.title }}
            </p>
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >UUID</label
            >
            <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">
              {{ assessmentPlan.uuid }}
            </p>
          </div>

          <div v-if="assessmentPlan.metadata.version">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >Version</label
            >
            <p class="text-gray-900 dark:text-slate-300">
              {{ assessmentPlan.metadata.version }}
            </p>
          </div>

          <div v-if="assessmentPlan.metadata.lastModified">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >Last Modified</label
            >
            <p class="text-gray-900 dark:text-slate-300">
              {{ formatDate(assessmentPlan.metadata.lastModified) }}
            </p>
          </div>
        </div>

        <div v-if="assessmentPlan.metadata.remarks" class="mb-6">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Remarks</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ assessmentPlan.metadata.remarks }}
          </p>
        </div>

        <!-- Import SSP Information -->
        <div v-if="assessmentPlan.importSsp" class="mb-6">
          <h3 class="text-lg font-semibold mb-4 dark:text-slate-300">
            Import SSP
          </h3>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
                >SSP Reference</label
              >
              <p class="text-blue-600 dark:text-blue-400 break-all">
                {{ assessmentPlan.importSsp.href }}
              </p>
            </div>
            <div v-if="assessmentPlan.importSsp.remarks">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
                >SSP Remarks</label
              >
              <p class="text-gray-900 dark:text-slate-300">
                {{ assessmentPlan.importSsp.remarks }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-3 flex-wrap">
          <RouterLink
            :to="{
              name: 'assessment-plan-edit',
              params: { id: assessmentPlan.uuid },
            }"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
          >
            Edit Assessment Plan
          </RouterLink>
          <RouterLink
            :to="{
              name: 'assessment-plan-tasks',
              params: { id: assessmentPlan.uuid },
            }"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Manage Tasks
          </RouterLink>
        </div>

        <!-- Feature Notice -->
        <div
          class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
        >
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Available Features:</strong> You can manage assessment
            tasks, subjects, and assets. Assessment plan metadata and import SSP
            configuration can be edited through the edit form.
          </p>
        </div>

        <!-- Summary Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ assessmentCounts.tasks }}
            </div>
            <div class="text-sm text-blue-600 dark:text-blue-400">Tasks</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ assessmentCounts.subjects }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">
              Subjects
            </div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div
              class="text-2xl font-bold text-purple-600 dark:text-purple-400"
            >
              {{ assessmentCounts.localComponents }}
            </div>
            <div class="text-sm text-purple-600 dark:text-purple-400">
              Local Components
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          Loading assessment plan...
        </p>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, onActivated } from 'vue';
import type { Task, AssessmentPlan, AssessmentSubject } from '@/oscal';
import { useRoute } from 'vue-router';
import { useDataApi } from '@/composables/axios';

const route = useRoute();
const { data: assessmentPlan, execute: refreshAssessmentPlan } =
  useDataApi<AssessmentPlan>(
    `/api/oscal/assessment-plans/${route.params.id}`,
    null,
    { immediate: false },
  );
const { data: tasks, execute: refreshTasks } = useDataApi<Task[]>(
  `/api/oscal/assessment-plans/${route.params.id}/tasks`,
  null,
  { immediate: false },
);
const { data: subjects, execute: refreshSubjects } = useDataApi<
  AssessmentSubject[]
>(`/api/oscal/assessment-plans/${route.params.id}/assessment-subjects`, null, {
  immediate: false,
});

const assessmentCounts = computed(() => ({
  tasks: tasks.value?.length || 0,
  subjects: subjects.value?.length || 0,
  // assets: assets.value?.length || 0,
  localComponents: 'N/A', // TODO: Add API endpoint for local definitions / components
}));

onActivated(async () => {
  await refreshAssessmentPlan();
  await refreshTasks();
  await refreshSubjects();
});

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}
</script>
