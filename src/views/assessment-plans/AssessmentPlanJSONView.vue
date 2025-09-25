<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
  >
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">
        Assessment Plan JSON
      </h3>
      <div class="flex gap-3">
        <PrimaryButton @click="downloadJSON"> Download JSON </PrimaryButton>
        <!-- <button
          v-if="!isEditing"
          @click="startEditing"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
        >
          Edit JSON
        </button>
        <template v-else>
          <button
            @click="saveJSON"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            Save Changes
          </button>
          <button
            @click="cancelEditing"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Cancel
          </button>
        </template> -->
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">
        Loading assessment plan...
      </p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else>
      <div v-if="!isEditing" class="relative">
        <pre
          class="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg overflow-auto text-sm font-mono border border-gray-200 dark:border-slate-600 max-h-96"
        ><code>{{ formattedJSON }}</code></pre>
      </div>

      <div v-else class="relative">
        <textarea
          v-model="editableJSON"
          class="w-full h-96 p-4 font-mono text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-300"
          placeholder="Enter valid JSON..."
        ></textarea>

        <div
          v-if="jsonError"
          class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm"
        >
          <strong>JSON Error:</strong> {{ jsonError }}
        </div>
      </div>

      <!-- JSON Validation Notice -->
      <div
        class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
      >
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Warning:</strong> Editing JSON directly can break the
          assessment plan structure. Make sure the JSON is valid and follows the
          OSCAL Assessment Plan schema before saving.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AssessmentPlan } from '@/oscal';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';
import decamelizeKeys from 'decamelize-keys';

const route = useRoute();
const toast = useToast();

const isEditing = ref(false);
const editableJSON = ref('');
const jsonError = ref<string | null>(null);

const {
  data: assessmentPlan,
  error,
  isLoading: loading,
} = useDataApi<AssessmentPlan>(
  `/api/oscal/assessment-plans/${route.params.id}/full`,
);

const formattedJSON = computed(() => {
  if (!assessmentPlan.value) return '';
  return JSON.stringify(assessmentPlan.value, null, 2);
});

// function startEditing() {
//   editableJSON.value = formattedJSON.value
//   isEditing.value = true
//   jsonError.value = null
// }

// function cancelEditing() {
//   isEditing.value = false
//   editableJSON.value = ''
//   jsonError.value = null
// }

// function validateJSON(): boolean {
//   try {
//     JSON.parse(editableJSON.value)
//     jsonError.value = null
//     return true
//   } catch (err) {
//     jsonError.value = err instanceof Error ? err.message : 'Invalid JSON format'
//     return false
//   }
// }

// async function saveJSON() {
//   if (!validateJSON()) {
//     return
//   }

//   try {
//     const parsedJSON = JSON.parse(editableJSON.value)
//     const id = route.params.id as string

//     await assessmentPlanStore.update(id, parsedJSON)

//     // Reload the data
//     await loadAssessmentPlan()

//     toast.add({
//       severity: 'success',
//       summary: 'JSON Updated',
//       detail: 'Assessment plan JSON has been updated successfully',
//       life: 3000
//     })

//     isEditing.value = false
//   } catch (error) {
//     toast.add({
//       severity: 'error',
//       summary: 'Error updating JSON',
//       detail: 'Failed to update assessment plan JSON. Please check the format and try again.',
//       life: 3000
//     })
//   }
// }

async function downloadJSON() {
  try {
    const id = route.params.id as string;
    const jsonData = JSON.stringify(
      decamelizeKeys(assessmentPlan.value!, { separator: '-', deep: true }),
      null,
      2,
    );

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment-plan-${id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: 'Assessment plan JSON downloaded successfully',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to download assessment plan JSON',
      life: 3000,
    });
  }
}
</script>
