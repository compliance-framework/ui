<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div>
      <PageHeader>New Catalog</PageHeader>
      <PageSubHeader>Create a new catalog</PageSubHeader>
    </div>
    <SecondaryButton type="button" @click="cancel">Cancel</SecondaryButton>
  </div>

  <PageCard class="mt-8 w-full max-w-2xl">
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="catalog-id" required>ID</Label>
        <div class="flex items-center">
          <InputText
            id="catalog-id"
            v-model="catalog.uuid"
            placeholder="Catalog UUID"
            class="w-full rounded-r-none border-r-0"
            :invalid="!!errors.uuid"
          />
          <TertiaryButton
            type="button"
            @click="generateUuid"
            class="self-stretch rounded-l-none"
            title="Generate UUID"
          >
            <i class="pi pi-refresh"></i>
          </TertiaryButton>
        </div>
        <small v-if="errors.uuid" class="text-red-500">
          {{ errors.uuid }}
        </small>
      </div>
      <div>
        <Label for="catalog-title" required>Title</Label>
        <InputText
          id="catalog-title"
          v-model="catalog.metadata.title"
          placeholder="Enter catalog title"
          class="w-full"
          :invalid="!!errors.title"
        />
        <small v-if="errors.title" class="text-red-500">
          {{ errors.title }}
        </small>
      </div>

      <div>
        <Label for="catalog-type" required>Type</Label>
        <Select
          id="catalog-type"
          v-model="selectedType"
          :options="CATALOG_TYPE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <Message v-if="errorMessage" severity="error">
        {{ errorMessage }}
      </Message>

      <div
        class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="cancel">Cancel</SecondaryButton>
        <PrimaryButton
          type="submit"
          :disabled="isSubmitting || !can(RESOURCES.CATALOG, ACTIONS.CREATE)"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE),
            disabled: can(RESOURCES.CATALOG, ACTIONS.CREATE),
          }"
        >
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          Create Catalog
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { type Catalog } from '@/oscal';
import { useRouter } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { CATALOG_TYPE_NS, type CatalogType } from '@/composables/catalog';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import type { AxiosError } from 'axios';

const { can, permissionTooltip } = usePermissions();

const CATALOG_TYPE_OPTIONS: { value: CatalogType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'policy', label: 'Policy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'internal', label: 'Internal Catalog' },
  { value: 'other', label: 'Other' },
];

const catalog = ref<Catalog>({
  metadata: {},
} as Catalog);
const selectedType = ref<CatalogType>('standard');
const toast = useToast();
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

const { execute } = useDataApi<Catalog>('/api/oscal/catalogs', {
  headers: { 'Content-Type': 'application/json' },
  transformRequest: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data, headers) => decamelizeKeys(data as any, headers as any),
  ],
});

const router = useRouter();

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!catalog.value.uuid?.trim()) {
    errors.uuid = 'ID is required';
  }
  if (!catalog.value.metadata?.title?.trim()) {
    errors.title = 'Title is required';
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    // The backend derives a catalog's type from a `catalog-type` metadata prop;
    // an absent prop means `standard`, so we only stamp it for other types.
    const props = (catalog.value.metadata.props ?? []).filter(
      (p) => !(p.name === 'catalog-type' && p.ns === CATALOG_TYPE_NS),
    );
    if (selectedType.value !== 'standard') {
      props.push({
        name: 'catalog-type',
        ns: CATALOG_TYPE_NS,
        value: selectedType.value,
      });
    }
    const payload: Catalog = {
      ...catalog.value,
      metadata: {
        ...catalog.value.metadata,
        ...(props.length ? { props } : {}),
      },
    };

    await execute({
      method: 'POST',
      data: payload,
    });
    router.push({ name: 'catalog-view', params: { id: catalog.value.uuid } });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    errorMessage.value =
      errorResponse.response?.data.errors?.body ||
      'An error occurred while creating the catalog.';
    toast.add({
      severity: 'error',
      summary: 'Error creating catalog',
      detail: errorMessage.value,
      life: 3000,
    });
    return;
  } finally {
    isSubmitting.value = false;
  }
}

function generateUuid() {
  catalog.value.uuid = uuidv4();
}

function cancel() {
  router.push({ name: 'catalog-list' });
}
</script>
