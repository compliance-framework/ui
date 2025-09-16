<template>
  <PageHeader>Edit Plan of Action and Milestones</PageHeader>
  <template v-if="planOfActionAndMilestones">
    <PageSubHeader>{{
      planOfActionAndMilestones.metadata?.title
    }}</PageSubHeader>

    <PageCard class="mt-8 w-1/2">
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >ID</label
          >
          <div
            class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
          >
            <span class="text-gray-600 dark:text-slate-400 font-mono">{{
              planOfActionAndMilestones.uuid
            }}</span>
          </div>
        </div>

        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >Title</label
          >
          <FormInput v-model="planOfActionAndMilestones.metadata.title" />
        </div>

        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >Version</label
          >
          <FormInput v-model="planOfActionAndMilestones.metadata.version" />
        </div>

        <div class="mb-4">
          <label
            class="inline-block pb-2 font-medium text-gray-700 dark:text-slate-300"
            >Remarks</label
          >
          <FormTextarea v-model="planOfActionAndMilestones.metadata.remarks" />
        </div>

        <div class="flex gap-4 justify-end">
          <SecondaryButton type="button" @click="cancel">
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit"> Save Changes </PrimaryButton>
        </div>
      </form>
    </PageCard>
  </template>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { POAM } from '@/stores/plan-of-action-and-milestones.ts';
import { useRouter, useRoute } from 'vue-router';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const { data: planOfActionAndMilestones } = useDataApi<POAM>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}`,
);
const { execute: updatePOAM } = useDataApi<POAM>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function submit() {
  try {
    await updatePOAM({
      data: planOfActionAndMilestones.value,
    });
    toast.add({
      severity: 'success',
      summary: 'POAM Updated',
      detail: 'Plan of Action and Milestones updated successfully',
      life: 3000,
    });
    await router.push({
      name: 'plan-of-action-and-milestones-overview',
      params: { id: planOfActionAndMilestones.value!.uuid },
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: `Failed to update Plan of Action and Milestones ${errorResponse.response?.data?.errors.body}. Please check your input and try again.`,
      life: 3000,
    });
  }
}

function cancel() {
  router.push({
    name: 'plan-of-action-and-milestones-overview',
    params: { id: route.params.id },
  });
}
</script>
