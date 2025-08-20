<template>
  <Dialog v-model:visible="show" modal>
    <div class="px-12 py-8">
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
import TaskEditForm from '@/components/assessment-plans/TaskEditForm.vue';
import type { Task } from '@/stores/assessment-plans.ts';

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(task: Task) {
    return !!task.uuid;
  },
});

const props = defineProps<{
  assessmentPlanId: string;
  task: Task;
}>();

function done(task: Task) {
  show.value = false;
  emit('updated', task);
}
</script>
