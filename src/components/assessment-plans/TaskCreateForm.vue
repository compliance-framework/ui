<template>
  <form @submit.prevent="createTask()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new task</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="task.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
      <FormInput v-model="task.title" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <FormInput v-model="task.type" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description</label>
      <FormTextarea v-model="task.description" rows="3" />
    </div>

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Task</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'
import { useDataApi, decamelizeKeys } from '@/composables/axios'

const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
}>()

const emit = defineEmits<{
  created: [task: Task]
  cancel: []
}>()

const task = ref<Task>({
  uuid: uuidv4(),
  type: '',
  title: '',
  description: '',
  props: [],
  links: []
})
const { data: newTask, execute: executeCreateTask } = useDataApi<Task>(`/api/oscal/assessment-plans/${props.assessmentPlanId}/tasks`,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys]
  }, { immediate: false }
)

const errorMessage = ref('')

async function createTask(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!task.value.title?.trim() || !task.value.type?.trim()) {
    errorMessage.value = 'Title and type are required'
    return
  }

  try {
    await executeCreateTask({
      data: task.value
    })

    toast.add({
      severity: 'success',
      summary: 'Task Created',
      detail: 'Task has been created successfully',
      life: 3000
    })

    emit('created', newTask.value!)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Task',
      detail: error instanceof Error ? error.message : 'Failed to create task',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create task'
  }
}

function generateUuid() {
  task.value.uuid = uuidv4()
}
</script>
