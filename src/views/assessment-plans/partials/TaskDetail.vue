<script setup lang="ts">
import {
  type AssessmentAsset,
  type AssessmentPlan,
  type Task,
  useAssessmentPlanStore
} from '@/stores/assessment-plans.ts'
import TaskEditModal from '@/components/assessment-plans/TaskEditModal.vue'
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast();
const confirm = useConfirm();
const assessmentPlanStore = useAssessmentPlanStore();

const props = defineProps<{
  assessmentPlan: AssessmentPlan,
  task: Task
}>()

const emit = defineEmits<{
  updated: [task: Task]
  deleted: [task: Task]
}>()

const showEditModal = ref(false)
function editTask() {
  showEditModal.value = true
}

async function onTaskUpdated(task: Task) {
  emit('updated', task)
}

async function removeTask() {
  confirm.require({
    message: 'Are you sure you want to remove this task?',
    header: 'Remove Task',
    rejectProps: {
      label: "Cancel",
    },
    acceptProps: {
      label: "Yes",
      severity: "danger",
    },
    accept: async () => {
      await assessmentPlanStore.deleteTask(props.assessmentPlan.uuid, props.task.uuid)
      emit('deleted', props.task)
      toast.add({
        severity: 'success',
        summary: 'Task Removed',
        detail: 'Task has been removed successfully',
        life: 3000
      })
    },
  })
}
</script>

<template>
  <div class="flex justify-between items-start mb-2">
    <div class="flex">
      <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ props.task.title }}</h4>
    </div>
    <div class="flex gap-2">
      <button
        @click="editTask"
        class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </button>
      <button
        @click="removeTask"
        class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
      >
        Remove
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pl-4">
    <div>
      <span class="font-medium text-gray-700 dark:text-slate-400">Type:</span>
      <span class="ml-2 text-gray-900 dark:text-slate-300">{{ props.task.type }}</span>
    </div>
    <div v-if="props.task.uuid">
      <span class="font-medium text-gray-700 dark:text-slate-400">UUID:</span>
      <span class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{{ props.task.uuid }}</span>
    </div>
  </div>

  <div v-if="props.task.description" class="mt-2">
    <span class="font-medium text-gray-700 dark:text-slate-400">Description:</span>
    <p class="mt-1 text-gray-900 dark:text-slate-300">{{ props.task.description }}</p>
  </div>

  <!-- Task Edit Modal -->
  <TaskEditModal
    v-model="showEditModal"
    :assessment-plan-id="props.assessmentPlan.uuid"
    :task="props.task"
    @updated="onTaskUpdated"
  />
</template>
