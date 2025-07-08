<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Tasks</h3>
      <button
        @click="addTask"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Add Task
      </button>
    </div>

    <div v-if="tasks.length > 0">
      <div class="space-y-4">
        <div
          v-for="(task, index) in tasks"
          :key="task.uuid || index"
          class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ task.title }}</h4>
            <div class="flex gap-2">
              <button
                @click="editTask(index)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
              <button
                @click="removeTask(index)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700 dark:text-slate-400">Type:</span>
              <span class="ml-2 text-gray-900 dark:text-slate-300">{{ task.type }}</span>
            </div>
            <div v-if="task.uuid">
              <span class="font-medium text-gray-700 dark:text-slate-400">UUID:</span>
              <span class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{{ task.uuid }}</span>
            </div>
          </div>

          <div v-if="task.description" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400">Description:</span>
            <p class="mt-1 text-gray-900 dark:text-slate-300">{{ task.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No tasks defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">Click "Add Task" to create your first assessment task.</p>
    </div>

    <!-- Task Edit Modal (Simple inline form for now) -->
    <div v-if="editingTaskIndex !== null" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h4 class="text-lg font-semibold mb-4 dark:text-slate-300">
          {{ editingTaskIndex === -1 ? 'Add Task' : 'Edit Task' }}
        </h4>

        <form @submit.prevent="saveTask">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</label>
            <input
              v-model="editingTask.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Type</label>
            <input
              v-model="editingTask.type"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</label>
            <textarea
              v-model="editingTask.description"
              rows="3"
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
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              {{ editingTaskIndex === -1 ? 'Add' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type Task, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const tasks = ref<Task[]>([])
const editingTaskIndex = ref<number | null>(null)
const editingTask = ref<Task>({} as Task)

function addTask() {
  editingTask.value = {
    uuid: uuidv4(),
    type: '',
    title: '',
    description: ''
  } as Task
  editingTaskIndex.value = -1
}

function editTask(index: number) {
  editingTask.value = { ...tasks.value[index] }
  editingTaskIndex.value = index
}

function cancelEdit() {
  editingTaskIndex.value = null
  editingTask.value = {} as Task
}

async function saveTask() {
  try {
    if (editingTaskIndex.value === -1) {
      // Add new task
      tasks.value.push({ ...editingTask.value })
    } else {
      // Update existing task
      tasks.value[editingTaskIndex.value] = { ...editingTask.value }
    }

    // Save to backend
    const id = route.params.id as string
    await assessmentPlanStore.updateTasks(id, tasks.value)

    toast.add({
      severity: 'success',
      summary: 'Task Saved',
      detail: 'Task has been saved successfully',
      life: 3000
    })

    cancelEdit()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error saving task',
      detail: 'Failed to save task. Please try again.',
      life: 3000
    })
  }
}

async function removeTask(index: number) {
  if (confirm('Are you sure you want to remove this task?')) {
    try {
      tasks.value.splice(index, 1)

      // Save to backend
      const id = route.params.id as string
      await assessmentPlanStore.updateTasks(id, tasks.value)

      toast.add({
        severity: 'success',
        summary: 'Task Removed',
        detail: 'Task has been removed successfully',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error removing task',
        detail: 'Failed to remove task. Please try again.',
        life: 3000
      })
    }
  }
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.get(id)
    tasks.value = response.data.tasks || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading tasks',
      detail: 'Failed to load assessment plan tasks. Please try again.',
      life: 3000
    })
  }
})
</script>
