<template>
  <form @submit.prevent="createTask()">
    <div class="mb-4">
      <Label>UUID</Label>
      <div class="flex items-center place-items-stretch">
        <InputText
          v-model="task.uuid"
          disabled
          class="rounded-r-none border-r-0 grow"
        />
        <SecondaryButton
          type="button"
          @click="generateUuid"
          class="py-3 rounded-l-none"
          ><BIconArrowRepeat
        /></SecondaryButton>
      </div>
    </div>

    <div class="mb-4">
      <Label required>Title</Label>
      <InputText v-model="task.title" required class="block w-full" />
    </div>

    <div class="mb-4">
      <Label required>Type</Label>
      <Select
        v-model="task.type"
        :options="[{ name: 'Action', value: 'action' }]"
        optionLabel="name"
        optionValue="value"
        class="block w-full"
      />
    </div>

    <div class="mb-4">
      <Label>Description</Label>
      <Textarea
        v-model="task.description"
        class="block w-full field-sizing-content"
      />
    </div>

    <div class="mb-4">
      <Label>Remarks</Label>
      <Textarea
        v-model="task.remarks"
        class="block w-full field-sizing-content"
      />
    </div>

    <!-- Task Timing Section -->
    <TaskTimingManager v-model="task.timing" />

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Task</PrimaryButton>
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
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import Select from '@/volt/Select.vue';
import TaskTimingManager from './TaskTimingManager.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Label from '@/volt/Label.vue';

const toast = useToast();

const props = defineProps<{
  assessmentPlanId: string;
}>();

const emit = defineEmits<{
  created: [task: Task];
  cancel: [];
}>();

const task = ref<Task>({
  uuid: uuidv4(),
  type: 'action',
  title: '',
  description: '',
  props: [],
  links: [],
});
const { data: newTask, execute: executeCreateTask } = useDataApi<Task>(
  `/api/oscal/assessment-plans/${props.assessmentPlanId}/tasks`,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorMessage = ref('');

async function createTask(): Promise<void> {
  errorMessage.value = '';

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing';
    return;
  }

  if (!task.value.title?.trim() || !task.value.type?.trim()) {
    errorMessage.value = 'Title and type are required';
    return;
  }

  try {
    await executeCreateTask({
      data: task.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Task Created',
      detail: 'Task has been created successfully',
      life: 3000,
    });

    emit('created', newTask.value!);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Task',
      detail: error instanceof Error ? error.message : 'Failed to create task',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create task';
  }
}

function generateUuid() {
  task.value.uuid = uuidv4();
}
</script>
