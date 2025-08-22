<template>
  <PageHeader>Edit Assessment Plan</PageHeader>
  <template v-if="loading">
    <p>Loading assessment plans...</p>
  </template>
  <template v-else-if="error">
    <p class="text-red-500">
      Error loading assessment plan: {{ errorMessage }}
    </p>
  </template>
  <template v-if="assessmentPlan">
    <PageSubHeader>{{ assessmentPlan.metadata?.title }}</PageSubHeader>

    <PageCard class="mt-8 w-1/2">
      <form @submit.prevent="submit" v-if="!loading">
        <div class="mb-4">
          <label class="inline-block pb-2">ID</label>
          <FormInput
            v-model="assessmentPlan.uuid"
            disabled
            class="bg-gray-100 dark:bg-slate-700"
          />
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Assessment Plan ID cannot be changed
          </p>
        </div>

        <div class="mb-4">
          <label class="inline-block pb-2"
            >Title <span class="text-red-500">*</span></label
          >
          <FormInput v-model="assessmentPlan.metadata.title" required />
        </div>

        <div class="mb-4">
          <label class="inline-block pb-2">Version</label>
          <FormInput v-model="assessmentPlan.metadata.version" />
        </div>

        <div class="mb-4">
          <label class="inline-block pb-2">Remarks</label>
          <FormTextarea v-model="assessmentPlan.metadata.remarks" />
        </div>

        <div class="mb-4">
          <label class="inline-block pb-2">Published Date</label>
          <FormInput v-model="assessmentPlan.metadata.published" type="date" />
        </div>

        <h3 class="text-lg font-semibold mb-4 mt-8 dark:text-slate-300">
          Import SSP Configuration
        </h3>

        <div class="mb-4">
          <label class="inline-block pb-2"
            >SSP Reference URL <span class="text-red-500">*</span></label
          >
          <FormInput
            v-model="assessmentPlan.importSsp.href"
            placeholder="https://example.com/ssp.json"
            required
          />
        </div>

        <div class="mb-4">
          <label class="inline-block pb-2">SSP Import Remarks</label>
          <FormTextarea v-model="assessmentPlan.importSsp.remarks" />
        </div>

        <div class="flex justify-between items-center mt-8">
          <RouterLink
            :to="{
              name: 'assessment-plan-overview',
              params: { id: assessmentPlan.uuid },
            }"
            class="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-300"
          >
            ← Back to Overview
          </RouterLink>

          <div class="flex gap-3">
            <RouterLink
              :to="{
                name: 'assessment-plan-overview',
                params: { id: assessmentPlan.uuid },
              }"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </RouterLink>
            <PrimaryButton type="submit"> Save Changes </PrimaryButton>
          </div>
        </div>
      </form>
    </PageCard>
  </template>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import type { AssessmentPlan } from '@/stores/assessment-plans.ts';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { AxiosError } from 'axios';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const {
  data: assessmentPlan,
  isLoading: loading,
  error,
} = useDataApi<AssessmentPlan>(
  `/api/oscal/assessment-plans/${route.params.id}`,
);
const { execute: executeUpdate } = useDataApi<AssessmentPlan>(
  `/api/oscal/assessment-plans/${route.params.id}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorMessage = computed(() => {
  const err = error as unknown as AxiosError<ErrorResponse<ErrorBody>>;
  return err.response?.data.errors.body || 'Unknown error';
});

async function submit() {
  try {
    // Validate required fields
    if (!assessmentPlan.value!.metadata.title) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Title is required',
        life: 3000,
      });
      return;
    }

    if (!assessmentPlan.value!.importSsp.href) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Import SSP URL is required',
        life: 3000,
      });
      return;
    }

    // Validate URL format
    try {
      new URL(assessmentPlan.value!.importSsp.href);
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Import SSP URL must be a valid URL',
        life: 3000,
      });
      return;
    }

    // Update last modified timestamp
    assessmentPlan.value!.metadata.lastModified = new Date().toISOString();

    await executeUpdate({
      data: assessmentPlan.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Assessment Plan Updated',
      detail: 'Assessment plan has been updated successfully',
      life: 3000,
    });

    // Redirect back to overview
    await router.push({
      name: 'assessment-plan-overview',
      params: { id: assessmentPlan.value!.uuid },
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error updating assessment plan',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to update assessment plan. Please check your input and try again.',
      life: 3000,
    });
  }
}
</script>
