<template>
  <PageHeader>New Catalog</PageHeader>
  <PageSubHeader>Create a new Catalog</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="catalog.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton
            type="button"
            @click="generateUuid"
            class="py-3 rounded-l-none"
            ><BIconArrowRepeat
          /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Name</label>
        <FormInput v-model="catalog.metadata.title" />
      </div>
      <div class="text-right">
        <PrimaryButton type="submit"> Submit </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { type Catalog } from '@/oscal';
import { useRouter } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import type { AxiosError } from 'axios';

const catalog = ref<Catalog>({
  metadata: {},
} as Catalog);
const toast = useToast();

const { execute } = useDataApi<Catalog>('/api/oscal/catalogs', {
  headers: { 'Content-Type': 'application/json' },
  transformRequest: [
    (data, headers) => decamelizeKeys(data as any, headers as any),
  ],
});

const router = useRouter();

async function submit() {
  try {
    if (!catalog.value.uuid || !catalog.value.metadata?.title) {
      toast.add({
        severity: 'warn',
        summary: 'Missing required fields',
        detail: 'Please set ID and Name before submitting.',
        life: 3000,
      });
      return;
    }
    await execute({
      method: 'POST',
      data: catalog.value,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: [
        (data, headers) => decamelizeKeys(data as any, headers as any),
      ],
    });
    router.push({ name: 'catalog-view', params: { id: catalog.value.uuid } });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating catalog',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while creating the catalog.',
      life: 3000,
    });
    return;
  }
}

function generateUuid() {
  catalog.value.uuid = uuidv4();
}
</script>
