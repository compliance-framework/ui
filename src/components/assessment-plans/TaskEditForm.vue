<template>
  <form @submit.prevent="updateTask()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit task</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div
        class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
      >
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{
          taskData.uuid
        }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Title <span class="text-red-500">*</span></label
      >
      <FormInput v-model="taskData.title" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Type <span class="text-red-500">*</span></label
      >
      <FormInput v-model="taskData.type" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description</label>
      <FormTextarea v-model="taskData.description" rows="3" />
    </div>

    <!-- Task Timing Section -->
    <TaskTimingManager v-model="taskData.timing" />

    <!-- Task Dependencies Section -->
    <TaskDependencyManager
      v-if="taskData.dependencies"
      v-model="taskData.dependencies"
      :assessment-plan-id="assessmentPlanId"
      :current-task-uuid="taskData.uuid"
    />

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Task</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Task } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import TaskTimingManager from '@/components/forms/TaskTimingManager.vue';
import TaskDependencyManager from '@/components/forms/TaskDependencyManager.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const toast = useToast();

const props = defineProps<{
  assessmentPlanId: string;
  task: Task;
}>();

const emit = defineEmits<{
  updated: [task: Task];
  cancel: [];
}>();

const taskData = ref(props.task);
const errorMessage = ref('');

const { data: updatedTask, execute: updateTaskApi } = useDataApi<Task>(
  `/api/oscal/assessment-plans/${props.assessmentPlanId}/tasks/${taskData.value.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function updateTask(): Promise<void> {
  errorMessage.value = '';

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing';
    return;
  }

  if (!taskData.value.uuid) {
    errorMessage.value = 'Task UUID is missing';
    return;
  }

  if (!taskData.value.title?.trim() || !taskData.value.type?.trim()) {
    errorMessage.value = 'Title and type are required';
    return;
  }

  try {
    // Create the updated task data, preserving the original task structure
    const updatedTaskData = {
      ...props.task, // Preserve all original task fields
      type: taskData.value.type,
      title: taskData.value.title,
      description: taskData.value.description || '',
      props: taskData.value.props || [],
      links: taskData.value.links || [],
      timing: taskData.value.timing,
      dependencies: taskData.value.dependencies || [],
      responsibleRoles: taskData.value.responsibleRoles || [],
    } as Task;

    await updateTaskApi({
      data: updatedTaskData,
    });

    toast.add({
      severity: 'success',
      summary: 'Task Updated',
      detail: 'Task has been updated successfully',
      life: 3000,
    });

    emit('updated', updatedTask.value!);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Task',
      detail: error instanceof Error ? error.message : 'Failed to update task',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to update task';
  }
}
</script>
