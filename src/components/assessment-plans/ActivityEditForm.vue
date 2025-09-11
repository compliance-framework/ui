<template>
  <form @submit.prevent="updateActivity()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
      Edit activity
    </h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div
        class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
      >
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{
          activityData.uuid
        }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="activityData.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Description <span class="text-red-500">*</span></label
      >
      <FormTextarea v-model="activityData.description" rows="3" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="activityData.remarks" rows="2" />
    </div>

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Activity</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import { useActivityStore } from '@/stores/activities.ts';
import { type Activity } from '@/stores/activities.ts';

const activityStore = useActivityStore();
const toast = useToast();

const props = defineProps<{
  assessmentPlanId: string;
  activity: Activity;
}>();

const emit = defineEmits<{
  updated: [activity: Activity];
  cancel: [];
}>();

const activityData = ref<Activity>(props.activity);

const errorMessage = ref('');

async function updateActivity(): Promise<void> {
  errorMessage.value = '';
  try {
    const result = await activityStore.update(
      props.activity.uuid,
      activityData.value,
    );
    console.log('Update result:', result);

    toast.add({
      severity: 'success',
      summary: 'Activity Updated',
      detail: 'Activity has been updated successfully',
      life: 3000,
    });

    emit('updated', activityData.value);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Activity',
      detail:
        error instanceof Error ? error.message : 'Failed to update activity',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to update activity';
  }
}
</script>
