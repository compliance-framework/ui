<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
  >
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">
        Assessment Subjects
      </h3>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Subject
      </button>
    </div>

    <div v-if="subjects && subjects.length > 0">
      <div class="space-y-4">
        <div
          v-for="(subject, index) in subjects"
          :key="subject.uuid || index"
          class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">
              {{ subject.type || 'Subject' }}
            </h4>
            <div class="flex gap-2">
              <button
                @click="editSubject(subject)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
              <button
                @click="removeSubject(index)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700 dark:text-slate-400"
                >Type:</span
              >
              <span class="ml-2 text-gray-900 dark:text-slate-300">{{
                subject.type
              }}</span>
            </div>
            <div v-if="subject.uuid">
              <span class="font-medium text-gray-700 dark:text-slate-400"
                >UUID:</span
              >
              <span
                class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs"
                >{{ subject.uuid }}</span
              >
            </div>
          </div>

          <div v-if="subject.description" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400"
              >Description:</span
            >
            <p class="mt-1 text-gray-900 dark:text-slate-300">
              {{ subject.description }}
            </p>
          </div>

          <!-- Properties Section -->
          <div v-if="subject.props && subject.props.length > 0" class="mt-4">
            <span class="font-medium text-gray-700 dark:text-slate-400"
              >Properties:</span
            >
            <div class="mt-2 space-y-2">
              <div
                v-for="(prop, propIndex) in subject.props"
                :key="prop.uuid || propIndex"
                class="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-sm"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div v-if="prop.name">
                    <span class="font-medium text-gray-600 dark:text-slate-400"
                      >Name:</span
                    >
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{
                      prop.name
                    }}</span>
                  </div>
                  <div v-if="prop.value">
                    <span class="font-medium text-gray-600 dark:text-slate-400"
                      >Value:</span
                    >
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{
                      prop.value
                    }}</span>
                  </div>
                  <div v-if="prop.class">
                    <span class="font-medium text-gray-600 dark:text-slate-400"
                      >Class:</span
                    >
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{
                      prop.class
                    }}</span>
                  </div>
                  <div v-if="prop.ns">
                    <span class="font-medium text-gray-600 dark:text-slate-400"
                      >Namespace:</span
                    >
                    <span class="ml-1 text-gray-900 dark:text-slate-300">{{
                      prop.ns
                    }}</span>
                  </div>
                </div>
                <div v-if="prop.remarks" class="mt-1">
                  <span class="font-medium text-gray-600 dark:text-slate-400"
                    >Remarks:</span
                  >
                  <span class="ml-1 text-gray-900 dark:text-slate-300">{{
                    prop.remarks
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No subjects defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Add Subject" to create your first assessment subject.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AssessmentSubject } from '@/stores/assessment-plans.ts';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useDataApi } from '@/composables/axios';

const route = useRoute();
const toast = useToast();
const confirm = useConfirm();

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingSubject = ref<AssessmentSubject>({} as AssessmentSubject);

function editSubject(subject: AssessmentSubject) {
  editingSubject.value = { ...subject };
  showEditModal.value = true;
}

const { data: subjects, execute: loadSubjects } = useDataApi<
  AssessmentSubject[]
>(`/api/oscal/assessment-plans/${route.params.id}/assessment-subjects`, null, {
  immediate: false,
  initialData: [] as AssessmentSubject[],
});

async function removeSubject(index: number) {
  if (!subjects.value) return;
  confirm.require({
    message: 'Are you sure you want to remove this subject?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: {
      label: 'Yes, Delete Subject',
      severity: 'danger',
    },
    rejectProps: {
      label: 'No',
      severity: 'secondary',
    },
    accept: async () => {
      try {
        subjects.value!.splice(index, 1);

        // Save to backend
        // Unable to execute at the moment due to missing API endpoint to update subjects without updating the entire assessment plan
        throw new Error('API endpoint not implemented yet');

        // toast.add({
        //   severity: 'success',
        //   summary: 'Subject Removed',
        //   detail: 'Subject has been removed successfully',
        //   life: 3000
        // })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error removing subject',
          detail: 'Failed to remove subject. Please try again.',
          life: 3000,
        });
      }
    },
    reject: () => {
      toast.add({
        severity: 'info',
        summary: 'Action Cancelled',
        detail: 'Subject removal was cancelled.',
        life: 3000,
      });
    },
  });
}

onMounted(async () => {
  await loadSubjects();
});
</script>
