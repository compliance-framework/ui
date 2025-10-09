<template>
  <form @submit.prevent="updateTask()">
    <div class="mb-4">
      <Label>UUID</Label>
      <InputText v-model="taskData.uuid" disabled class="block w-full mt-1" />
    </div>

    <div class="mb-4">
      <Label required>Title</Label>
      <InputText v-model="taskData.title" required class="block w-full mt-1" />
    </div>

    <div class="mb-4">
      <Label required>Type</Label>
      <Select
        v-model="taskData.type"
        :options="[{ name: 'Action', value: 'action' }]"
        optionLabel="name"
        optionValue="value"
        class="block w-full mt-1"
      />
    </div>

    <div class="mb-4">
      <Label>Description</Label>
      <Textarea
        v-model="taskData.description"
        class="block w-full mt-1 field-sizing-content"
      />
    </div>

    <div class="mb-4">
      <Label>Remarks</Label>
      <Textarea
        v-model="taskData.remarks"
        class="block w-full mt-1 field-sizing-content"
      />
    </div>

    <!-- Task Timing Section -->
    <TaskTimingManager v-model="taskData.timing" />

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
import TaskTimingManager from './TaskTimingManager.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';

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
