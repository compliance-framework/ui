<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Tasks</h3>
      <button
        @click="showCreateModal = true"
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
                @click="editTask(task)"
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

    <!-- Task Create Modal -->
    <TaskCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="onTaskCreated"
    />

    <!-- Task Edit Modal -->
    <TaskEditModal
      v-model="showEditModal"
      :assessment-plan-id="route.params.id as string"
      :task="editingTask"
      @updated="onTaskUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type Task, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import TaskCreateModal from '@/components/assessment-plans/TaskCreateModal.vue'
import TaskEditModal from '@/components/assessment-plans/TaskEditModal.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const tasks = ref<Task[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingTask = ref<Task>({} as Task)

function editTask(task: Task) {
  editingTask.value = { ...task }
  showEditModal.value = true
}

async function onTaskCreated(task: Task) {
  // Refresh the tasks list from the backend
  await loadTasks()
}

async function onTaskUpdated(task: Task) {
  // Refresh the tasks list from the backend
  await loadTasks()
}

async function removeTask(index: number) {
  if (confirm('Are you sure you want to remove this task?')) {
    try {
      const taskToDelete = tasks.value[index]
      const id = route.params.id as string

      // Delete from backend first
      await assessmentPlanStore.deleteTask(id, taskToDelete.uuid)

      // Remove from local array only after successful backend deletion
      tasks.value.splice(index, 1)

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

async function loadTasks() {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.getTasks(id)
    tasks.value = response.data || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading tasks',
      detail: 'Failed to load assessment plan tasks. Please try again.',
      life: 3000
    })
  }
}

onMounted(async () => {
  await loadTasks()
})
</script>
