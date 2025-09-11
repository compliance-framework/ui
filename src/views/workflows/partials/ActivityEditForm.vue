<template>
  <form @submit.prevent="updateActivity()">
    <div class="mb-4">
      <Label>UUID</Label>
      <div
        class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
      >
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{
          activityData.uuid
        }}</span>
      </div>
    </div>

    <div class="mb-4">
      <Label required>Title</Label>
      <InputText v-model="activityData.title" class="block w-full" />
    </div>

    <div class="mb-4">
      <Label required>Description</Label>
      <Textarea
        v-model="activityData.description"
        class="block w-full field-sizing-content"
      />
    </div>

    <div class="mb-4">
      <Label>Remarks</Label>
      <Textarea
        v-model="activityData.remarks"
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
import { useActivityStore } from '@/stores/activities.ts';
import { type Activity } from '@/oscal';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Label from '@/volt/Label.vue';

const activityStore = useActivityStore();
const toast = useToast();

const props = defineProps<{
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
