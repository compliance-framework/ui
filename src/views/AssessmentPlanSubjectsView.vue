<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Subjects</h3>
      <button
        @click="addSubject"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Subject
      </button>
    </div>

    <div v-if="subjects.length > 0">
      <div class="space-y-4">
        <div
          v-for="(subject, index) in subjects"
          :key="subject.uuid || index"
          class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ subject.title || 'Untitled Subject' }}</h4>
            <div class="flex gap-2">
              <button
                @click="editSubject(index)"
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
              <span class="font-medium text-gray-700 dark:text-slate-400">Type:</span>
              <span class="ml-2 text-gray-900 dark:text-slate-300">{{ subject.type }}</span>
            </div>
            <div v-if="subject.uuid">
              <span class="font-medium text-gray-700 dark:text-slate-400">UUID:</span>
              <span class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{{ subject.uuid }}</span>
            </div>
          </div>

          <div v-if="subject.description" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400">Description:</span>
            <p class="mt-1 text-gray-900 dark:text-slate-300">{{ subject.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No subjects defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">Click "Add Subject" to create your first assessment subject.</p>
    </div>

    <!-- Subject Edit Modal -->
    <div v-if="editingSubjectIndex !== null" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h4 class="text-lg font-semibold mb-4 dark:text-slate-300">
          {{ editingSubjectIndex === -1 ? 'Add Subject' : 'Edit Subject' }}
        </h4>

        <form @submit.prevent="saveSubject">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
            <input
              v-model="editingSubject.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Type</label>
            <select
              v-model="editingSubject.type"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            >
              <option value="">Select type...</option>
              <option value="component">Component</option>
              <option value="inventory-item">Inventory Item</option>
              <option value="location">Location</option>
              <option value="party">Party</option>
              <option value="user">User</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
            <textarea
              v-model="editingSubject.description"
              rows="3"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              {{ editingSubjectIndex === -1 ? 'Add' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type AssessmentSubject, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const subjects = ref<AssessmentSubject[]>([])
const editingSubjectIndex = ref<number | null>(null)
const editingSubject = ref<AssessmentSubject>({} as AssessmentSubject)

function addSubject() {
  editingSubject.value = {
    uuid: uuidv4(),
    type: '',
    title: '',
    description: ''
  } as AssessmentSubject
  editingSubjectIndex.value = -1
}

function editSubject(index: number) {
  editingSubject.value = { ...subjects.value[index] }
  editingSubjectIndex.value = index
}

function cancelEdit() {
  editingSubjectIndex.value = null
  editingSubject.value = {} as AssessmentSubject
}

async function saveSubject() {
  try {
    if (editingSubjectIndex.value === -1) {
      // Add new subject
      subjects.value.push({ ...editingSubject.value })
    } else {
      // Update existing subject
      subjects.value[editingSubjectIndex.value] = { ...editingSubject.value }
    }

    // Save to backend
    const id = route.params.id as string
    await assessmentPlanStore.updateAssessmentSubjects(id, subjects.value)

    toast.add({
      severity: 'success',
      summary: 'Subject Saved',
      detail: 'Subject has been saved successfully',
      life: 3000
    })

    cancelEdit()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error saving subject',
      detail: 'Failed to save subject. Please try again.',
      life: 3000
    })
  }
}

async function removeSubject(index: number) {
  if (confirm('Are you sure you want to remove this subject?')) {
    try {
      subjects.value.splice(index, 1)

      // Save to backend
      const id = route.params.id as string
      await assessmentPlanStore.updateAssessmentSubjects(id, subjects.value)

      toast.add({
        severity: 'success',
        summary: 'Subject Removed',
        detail: 'Subject has been removed successfully',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error removing subject',
        detail: 'Failed to remove subject. Please try again.',
        life: 3000
      })
    }
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.get(id)
    subjects.value = response.data.assessmentSubjects || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading subjects',
      detail: 'Failed to load assessment plan subjects. Please try again.',
      life: 3000
    })
  }
})
</script>
