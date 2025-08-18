<template>
  <PageHeader>New Component Definition</PageHeader>
  <PageSubHeader>Create a new Component Definition</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput
            v-model="componentDefinition.uuid"
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
        <FormInput v-model="componentDefinition.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="componentDefinition.metadata.remarks" />
      </div>
      <div class="text-right">
        <PrimaryButton type="submit">
          Create Component Definition
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { type ComponentDefinition } from '@/stores/component-definitions.ts';
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

const componentDefinition = ref<ComponentDefinition>({
  metadata: {
    title: '',
    remarks: '',
  },
} as ComponentDefinition);

const { data, execute: createComponentDefinition } =
  useDataApi<ComponentDefinition>(
    '/api/oscal/component-definitions',
    { method: 'POST', transformRequest: [decamelizeKeys] },
    { immediate: false },
  );

const router = useRouter();
const toast = useToast();

async function submit() {
  try {
    await createComponentDefinition({
      data: componentDefinition.value,
    });
    await router.push({
      name: 'component-definition-overview',
      params: { id: data.value?.uuid },
    });
  } catch (error) {
    const responseError = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating component definition',
      detail: `Failed to create component definition: ${responseError.response?.data.errors.body || 'Unknown error'}. Please check your input and try again.`,
      life: 3000,
    });
  }
}

function generateUuid() {
  componentDefinition.value.uuid = uuidv4();
}
</script>
