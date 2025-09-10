<template>
  <Dialog
    header="Edit Task"
    size="lg"
    v-model:visible="show"
    modal
    :draggable="false"
  >
    <div>
      <TaskEditForm
        @updated="done"
        @cancel="show = false"
        :assessment-plan-id="assessmentPlanId"
        :task="task"
      />
    </div>
    <div
      class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4"
    >
      <PrimaryButton
        @click="show = false"
        class="px-2 py-1 border-ccf-300 dark:border-slate-700 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import TaskEditForm from './TaskEditForm.vue';
import type { Task } from '@/oscal';

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(task: Task) {
    return !!task.uuid;
  },
});

defineProps<{
  assessmentPlanId: string;
  task: Task;
}>();

function done(task: Task) {
  show.value = false;
  emit('updated', task);
}
</script>
