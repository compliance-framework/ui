<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { AxiosError } from 'axios';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { SystemSecurityPlan } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  focusFirstInvalidField,
  toErrorSummaryItems,
} from '@/composables/v2/useV2FormValidation';
import V2FormErrorSummary from '@/components/v2/forms/V2FormErrorSummary.vue';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { resolveApiErrorMessage } from './editors/sspEditorHelpers';
import { createSystemSecurityPlanDefaults } from './createSystemSecurityPlanDefaults';

const router = useRouter();
const toast = useToast();

const formId = 'system-security-plan-create-form';
const form = reactive({
  uuid: crypto.randomUUID(),
  title: '',
  version: '1.0.0',
  remarks: '',
});

const fieldErrors = reactive({
  title: '',
  version: '',
  server: '',
});

const {
  data: createdSystemSecurityPlan,
  execute: createSystemSecurityPlan,
  isLoading: creating,
} = useDataApi<SystemSecurityPlan>(
  null,
  { method: 'POST', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'ssp-create-title', message: fieldErrors.title },
    { fieldId: 'ssp-create-version', message: fieldErrors.version },
    { message: fieldErrors.server },
  ]),
);

const shortUuid = computed(() => {
  const normalized = form.uuid.trim();
  if (!normalized) {
    return 'PENDING';
  }

  return normalized.slice(0, 8).toUpperCase();
});

function resetErrors(): void {
  fieldErrors.title = '';
  fieldErrors.version = '';
  fieldErrors.server = '';
}

function validate(): boolean {
  resetErrors();

  const title = form.title.trim();
  const version = form.version.trim();

  if (!title) {
    fieldErrors.title = 'Title is required.';
  }

  if (!version) {
    fieldErrors.version = 'Version is required.';
  }

  const valid = !fieldErrors.title && !fieldErrors.version;

  if (!valid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) {
    return;
  }

  const payload = createSystemSecurityPlanDefaults({
    uuid: form.uuid.trim(),
    title: form.title.trim(),
    version: form.version.trim(),
    remarks: form.remarks.trim(),
  });

  try {
    await createSystemSecurityPlan('/api/oscal/system-security-plans', {
      data: payload,
    });

    const createdPlan = createdSystemSecurityPlan.value;
    const createdId = createdPlan?.uuid || payload.uuid;

    toast.add({
      severity: 'success',
      summary: 'System Security Plan Created',
      detail: 'System Security Plan created successfully.',
      life: 2500,
    });

    await router.push({
      name: 'system-security-plan-overview',
      params: { id: createdId },
    });
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      'Unable to create this System Security Plan.',
    );

    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;

    toast.add({
      severity: 'error',
      summary: 'Create Failed',
      detail: errorResponse.response?.data?.errors.body || fieldErrors.server,
      life: 4000,
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-3">
      <div
        class="ui-v2-nav flex flex-wrap items-center gap-2 text-[var(--ui-v2-secondary-foreground)]"
      >
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="transition-colors hover:text-[var(--ui-v2-foreground)]"
        >
          System Security Plans
        </RouterLink>
        <span class="text-[var(--ui-v2-tertiary-foreground)]">&gt;</span>
        <span class="text-[var(--ui-v2-foreground)]">Create</span>
      </div>

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h1
            class="font-[var(--ui-v2-font-primary)] text-[clamp(2rem,1.625rem+1.2vw,40px)] font-bold tracking-[-0.01em] text-[var(--ui-v2-foreground)]"
          >
            Create System Security Plan
          </h1>

          <p class="mt-2 max-w-[72ch] text-[var(--ui-v2-muted-foreground)]">
            Start a new SSP with core metadata. Attach a profile and continue
            setup after the record is created.
          </p>

          <div class="mt-3">
            <div
              class="flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-1"
            >
              <span
                class="ui-v2-label inline-flex shrink-0 items-center justify-center border border-[var(--ui-v2-info)] bg-[var(--ui-v2-info-tint-10)] px-2 py-[3px] text-[var(--ui-v2-info)]"
              >
                NEW
              </span>

              <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                <span class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                  >VERSION</span
                >
                <span
                  class="font-semibold text-[var(--ui-v2-secondary-foreground)]"
                >
                  {{ form.version.trim() || 'PENDING' }}
                </span>
              </div>

              <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                <span class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                  >UUID</span
                >
                <span
                  class="font-semibold text-[var(--ui-v2-secondary-foreground)]"
                >
                  {{ shortUuid }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <RouterLink
            :to="{ name: 'system-security-plans' }"
            class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 font-bold text-[var(--ui-v2-foreground)]"
          >
            BACK
          </RouterLink>

          <button
            type="submit"
            :form="formId"
            :disabled="creating"
            class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-5 font-bold text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ creating ? 'CREATING...' : 'CREATE' }}
          </button>
        </div>
      </div>
    </header>

    <V2FormErrorSummary :errors="errorSummary" />

    <form :id="formId" class="space-y-6" @submit.prevent="submit">
      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
      >
        <SspEditorSection
          variant="plain"
          title="BASICS"
          description="Define the initial SSP record. Additional system characteristics, implementation details, and control content can be added after creation."
        >
          <div class="space-y-1">
            <p
              class="ui-v2-label font-bold text-[var(--ui-v2-tertiary-foreground)]"
            >
              UUID
            </p>
            <p class="font-mono text-[var(--ui-v2-secondary-foreground)]">
              {{ form.uuid }}
            </p>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <V2FormField
              label="TITLE"
              input-id="ssp-create-title"
              required
              helper-text="This title becomes the SSP name in the library and detail shell."
              :error="fieldErrors.title"
            >
              <template #default="fieldProps">
                <InputText
                  v-model="form.title"
                  :input-id="fieldProps.inputId"
                  :aria-describedby="fieldProps.describedBy"
                  :aria-invalid="fieldProps.invalid"
                  fluid
                />
              </template>
            </V2FormField>

            <V2FormField
              label="VERSION"
              input-id="ssp-create-version"
              required
              helper-text="Use the initial document version for this SSP record."
              :error="fieldErrors.version"
            >
              <template #default="fieldProps">
                <InputText
                  v-model="form.version"
                  :input-id="fieldProps.inputId"
                  :aria-describedby="fieldProps.describedBy"
                  :aria-invalid="fieldProps.invalid"
                  fluid
                />
              </template>
            </V2FormField>
          </div>

          <V2FormField
            label="REMARKS"
            input-id="ssp-create-remarks"
            helper-text="Optional context for reviewers before profile attachment and full SSP authoring begin."
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.remarks"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                rows="5"
                fluid
              />
            </template>
          </V2FormField>
        </SspEditorSection>
      </section>
    </form>
  </div>
</template>
