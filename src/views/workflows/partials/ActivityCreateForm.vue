<template>
  <form @submit.prevent="createActivity()">
    <div class="mb-4">
      <Label>UUID</Label>
      <div class="flex items-center place-items-stretch">
        <InputText
          v-model="activity.uuid"
          disabled
          class="rounded-r-none border-r-0 grow"
        />
        <TertiaryButton
          type="button"
          @click="generateUuid"
          class="py-3 rounded-l-none"
        >
          <BIconArrowRepeat />
        </TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <Label required>Title</Label>
      <InputText v-model="activity.title" class="block w-full" />
    </div>

    <div class="mb-4">
      <Label required>Description</Label>
      <Textarea
        v-model="activity.description"
        required
        class="block w-full field-sizing-content"
      />
    </div>

    <div class="mb-4">
      <Label>Remarks</Label>
      <Textarea
        v-model="activity.remarks"
        class="block w-full field-sizing-content"
      />
    </div>

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Activity</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Activity, Task } from '@/oscal';
import { useActivityStore } from '@/stores/activities.ts';
import {
  type AssessmentPlan,
  useAssessmentPlanStore,
} from '@/stores/assessment-plans.ts';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import TertiaryButton from '@/components/TertiaryButton.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';

const assessmentPlanStore = useAssessmentPlanStore();
const activityStore = useActivityStore();
const toast = useToast();

const props = defineProps<{
  assessmentPlan: AssessmentPlan;
  task: Task;
}>();

const emit = defineEmits<{
  created: [activity: Activity];
  cancel: [];
}>();

const activity = ref<Activity>({
  uuid: uuidv4(),
} as Activity);

const errorMessage = ref('');

async function createActivity(): Promise<void> {
  errorMessage.value = '';

  if (!props.assessmentPlan.uuid) {
    errorMessage.value = 'Assessment plan ID is missing';
    return;
  }

  if (!activity.value.description?.trim()) {
    errorMessage.value = 'Description is required';
    return;
  }

  try {
    /**
 *
 *
 * async function create(activity: Activity): Promise<DataResponse<Activity>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(activity, { separator: '-' })),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Activity>;
  }
 *
 *
 * const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${taskId}/associated-activities/${activityId}`,
      {
        method: 'POST',
        credentials: 'include',
      },
    );


 */

    const activityResult = await activityStore.create(activity.value);
    await assessmentPlanStore.associateActivity(
      props.assessmentPlan.uuid,
      props.task.uuid,
      activityResult.data.uuid,
    );

    toast.add({
      severity: 'success',
      summary: 'Activity Created',
      detail: 'Activity has been created successfully',
      life: 3000,
    });

    emit('created', activityResult.data as Activity);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Activity',
      detail:
        error instanceof Error ? error.message : 'Failed to create activity',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create activity';
  }
}

function generateUuid() {
  activity.value.uuid = uuidv4();
}
</script>
