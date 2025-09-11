<template>
  <Dialog header="New Activity" v-model:visible="show" modal>
    <div>
      <ActivityCreateForm
        @created="done"
        @cancel="show = false"
        :assessment-plan="props.assessmentPlan"
        :task="props.task"
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
import ActivityCreateForm from './ActivityCreateForm.vue';
import type { Activity } from '@/stores/activities.ts';
import type { AssessmentPlan, Task } from '@/stores/assessment-plans.ts';

const show = defineModel<boolean>();

const emit = defineEmits({
  created(activity: Activity) {
    return !!activity.uuid;
  },
});

const props = defineProps<{
  assessmentPlan: AssessmentPlan;
  task: Task;
}>();

function done(activity: Activity) {
  show.value = false;
  emit('created', activity);
}
</script>
