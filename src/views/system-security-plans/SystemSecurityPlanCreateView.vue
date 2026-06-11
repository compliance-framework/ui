<template>
  <PageHeader>New System Security Plan</PageHeader>
  <PageSubHeader>Create a new System Security Plan</PageSubHeader>

  <PageCard class="mt-8 max-w-2xl">
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="ssp-id" required>ID</Label>
        <div class="flex items-center place-items-stretch">
          <InputText
            id="ssp-id"
            v-model="systemSecurityPlan.uuid"
            class="w-full rounded-r-none border-r-0"
            :disabled="isSubmitting"
            :invalid="!!errors.uuid"
          />
          <TertiaryButton
            type="button"
            @click="generateUuid"
            class="py-3 rounded-l-none"
            :disabled="isSubmitting"
            title="Regenerate UUID"
          >
            <i class="pi pi-refresh"></i>
          </TertiaryButton>
        </div>
        <small v-if="errors.uuid" class="text-red-500">
          {{ errors.uuid }}
        </small>
      </div>
      <div>
        <Label for="ssp-title" required>Title</Label>
        <InputText
          id="ssp-title"
          v-model="systemSecurityPlan.metadata.title"
          class="w-full"
          :disabled="isSubmitting"
          :invalid="!!errors.title"
        />
        <small v-if="errors.title" class="text-red-500">
          {{ errors.title }}
        </small>
      </div>
      <div>
        <Label for="ssp-version" required>Version</Label>
        <InputText
          id="ssp-version"
          v-model="systemSecurityPlan.metadata.version"
          class="w-full"
          :disabled="isSubmitting"
          :invalid="!!errors.version"
        />
        <small v-if="errors.version" class="text-red-500">
          {{ errors.version }}
        </small>
      </div>

      <Message v-if="errorMessage" severity="error">
        {{ errorMessage }}
      </Message>

      <div
        class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton
          type="button"
          :disabled="isSubmitting"
          @click="router.push({ name: 'system-security-plans' })"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" :disabled="isSubmitting">
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          Create System Security Plan
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { type SystemSecurityPlan } from '@/oscal';
import { useRouter } from 'vue-router';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import InputText from '@/volt/InputText.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const systemSecurityPlan = ref<SystemSecurityPlan>({
  uuid: uuidv4(),
  metadata: {
    title: '',
    version: '1.0.0',
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
const isSubmitting = ref(false);
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!systemSecurityPlan.value.uuid?.trim()) {
    errors.uuid = 'ID is required';
  }
  if (!systemSecurityPlan.value.metadata.title?.trim()) {
    errors.title = 'Title is required';
  }
  if (!systemSecurityPlan.value.metadata.version?.trim()) {
    errors.version = 'Version is required';
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (isSubmitting.value) return;
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    await createSystemSecurityPlan({
      data: systemSecurityPlan.value,
    });
    const createdUuid = data.value?.uuid;
    if (!createdUuid) {
      toast.add({
        severity: 'error',
        summary: 'Error creating system security plan',
        detail: 'Creation succeeded but no plan ID was returned.',
        life: 3000,
      });
      return;
    }
    await router.push({
      name: 'system-security-plan-editor',
      params: { id: createdUuid },
    });
  } catch (error) {
    const responseError = error as AxiosError<ErrorResponse<ErrorBody>>;
    errorMessage.value =
      responseError.response?.data.errors.body || 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Error creating system security plan',
      detail: `Failed to create system security plan: ${errorMessage.value}. Please check your input and try again.`,
      life: 3000,
    });
  } finally {
    isSubmitting.value = false;
  }
}

function generateUuid() {
  systemSecurityPlan.value.uuid = uuidv4();
}
</script>
