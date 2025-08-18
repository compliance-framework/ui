<template>
  <PageHeader>New Plan of Action and Milestones</PageHeader>
  <PageSubHeader>Create a new Plan of Action and Milestones</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="poam.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton
            type="button"
            @click="generateUuid"
            class="py-3 rounded-l-none"
            ><BIconArrowRepeat
          /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="poam.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Version</label>
        <FormInput v-model="poam.metadata.version" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="poam.metadata.remarks" />
      </div>
      <div class="text-right">
        <PrimaryButton type="submit">
          Create Plan of Action and Milestones
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { PlanOfActionAndMilestones } from '@/stores/plan-of-action-and-milestones.ts';
import { useRouter } from 'vue-router';
import TertiaryButton from '@/components/TertiaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const poam = ref<PlanOfActionAndMilestones>({
  uuid: '',
  metadata: {
    title: '',
    version: '',
    remarks: '',
  },
  systemId: {
    id: 'change-me',
    identifierType: '',
  },
  poamItems: [],
} as PlanOfActionAndMilestones);

const router = useRouter();
const toast = useToast();

const { data: newPOAM, execute: executeCreate } =
  useDataApi<PlanOfActionAndMilestones>(
    '/api/oscal/plan-of-action-and-milestones/',
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

async function submit() {
  try {
    await executeCreate({
      data: poam.value,
    });

    await router.push({
      name: 'plan-of-action-and-milestones-overview',
      params: { id: newPOAM.value!.uuid },
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating POAM',
      detail: `Failed to create Plan of Action and Milestones: ${errorResponse.response?.data.errors.body}. Please check your input and try again.`,
      life: 3000,
    });
  }
}

onMounted(() => {
  generateUuid();
});

function generateUuid() {
  poam.value.uuid = uuidv4();
}
</script>
