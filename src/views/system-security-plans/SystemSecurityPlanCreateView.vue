<template>
  <PageHeader>New System Security Plan</PageHeader>
  <PageSubHeader>Create a new System Security Plan</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput
            v-model="systemSecurityPlan.uuid"
            class="rounded-r-none border-r-0"
          />
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
        <FormInput v-model="systemSecurityPlan.metadata.title" required />
      </div>
      <div class="text-right">
        <PrimaryButton type="submit">
          Create System Security Plan
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { type SystemSecurityPlan } from '@/oscal';
import { useRouter } from 'vue-router';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const systemSecurityPlan = ref<SystemSecurityPlan>({
  uuid: uuidv4(),
  metadata: {
    title: '',
  },
} as SystemSecurityPlan);

const { data, execute: createSystemSecurityPlan } =
  useDataApi<SystemSecurityPlan>(
    '/api/oscal/system-security-plans',
    { method: 'POST', transformRequest: [decamelizeKeys] },
    { immediate: false },
  );

const router = useRouter();
const toast = useToast();

async function submit() {
  try {
    await createSystemSecurityPlan({
      data: systemSecurityPlan.value,
    });
    await router.push({
      name: 'system-security-plan-editor',
      params: { id: data.value?.uuid },
    });
  } catch (error) {
    const responseError = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating system security plan',
      detail: `Failed to create system security plan: ${responseError.response?.data.errors.body || 'Unknown error'}. Please check your input and try again.`,
      life: 3000,
    });
  }
}

function generateUuid() {
  systemSecurityPlan.value.uuid = uuidv4();
}
</script>
