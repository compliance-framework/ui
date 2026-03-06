<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { ControlImplementation } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  focusFirstInvalidField,
  toErrorSummaryItems,
} from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import SspEditorFormPage, {
  type SspEditorBreadcrumbItem,
} from '@/components/v2/system-security-plans/forms/SspEditorFormPage.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  getRouteParam,
  resolveApiErrorMessage,
} from './sspEditorHelpers';

const formId = 'ssp-control-implementation-editor';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sspId = computed(() => getRouteParam(route, 'id'));

const breadcrumbs = computed<SspEditorBreadcrumbItem[]>(() => [
  {
    label: 'CONTROLS',
    to: {
      name: 'system-security-plan-control-implementation',
      params: { id: sspId.value },
    },
  },
  { label: 'EDIT CONTROL IMPLEMENTATION' },
]);

const backTo = computed(() => ({
  name: 'system-security-plan-control-implementation',
  params: { id: sspId.value },
}));

const {
  data: controlImplementation,
  isLoading,
  execute: loadControlImplementation,
} = useDataApi<ControlImplementation>(null, null, { immediate: false });

const {
  data: savedControlImplementation,
  execute: saveControlImplementation,
  isLoading: isSaving,
} = useDataApi<ControlImplementation>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const loadErrorMessage = ref('');
const serverErrorMessage = ref('');
const descriptionError = ref('');

const form = reactive<ControlImplementation>({
  description: '',
  setParameters: [],
  implementedRequirements: [],
});

const errorSummary = computed(() =>
  toErrorSummaryItems([
    {
      fieldId: 'control-implementation-description',
      message: descriptionError.value,
    },
    { message: serverErrorMessage.value },
  ]),
);

watch(
  sspId,
  async (id) => {
    if (!id) {
      return;
    }

    loadErrorMessage.value = '';
    descriptionError.value = '';
    serverErrorMessage.value = '';

    try {
      await loadControlImplementation(
        `/api/oscal/system-security-plans/${id}/control-implementation`,
      );

      if (!controlImplementation.value) {
        throw new Error('Control implementation is unavailable.');
      }

      loadForm(controlImplementation.value);
    } catch (error) {
      loadErrorMessage.value = resolveApiErrorMessage(
        error,
        'Unable to load the control implementation editor.',
      );
    }
  },
  { immediate: true },
);

function loadForm(value: ControlImplementation): void {
  form.description = value.description || '';
  form.setParameters = cloneValue(value.setParameters || []).map(
    (parameter) => ({
      ...parameter,
      values: cloneValue(parameter.values || []),
    }),
  );
  form.implementedRequirements = cloneValue(
    value.implementedRequirements || [],
  );
}

function addParameter(): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.push({
    paramId: '',
    values: [''],
    remarks: '',
  });
}

function removeParameter(index: number): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.splice(index, 1);
}

function addParameterValue(parameterIndex: number): void {
  const parameter = form.setParameters?.[parameterIndex];
  if (!parameter) {
    return;
  }

  parameter.values = parameter.values || [];
  parameter.values.push('');
}

function removeParameterValue(
  parameterIndex: number,
  valueIndex: number,
): void {
  const parameter = form.setParameters?.[parameterIndex];
  if (!parameter?.values) {
    return;
  }

  parameter.values.splice(valueIndex, 1);
}

function validateForm(): boolean {
  descriptionError.value = '';
  serverErrorMessage.value = '';

  if (!form.description.trim()) {
    descriptionError.value = 'Description is required.';
    focusFirstInvalidField(document.getElementById(formId) || document);
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) {
    return;
  }

  try {
    await saveControlImplementation(
      `/api/oscal/system-security-plans/${sspId.value}/control-implementation`,
      {
        data: form,
      },
    );

    toast.add({
      severity: 'success',
      summary: 'Control Implementation Saved',
      detail: 'Control implementation updated successfully.',
      life: 2500,
    });

    if (savedControlImplementation.value) {
      loadForm(savedControlImplementation.value);
    }

    await router.push(backTo.value);
  } catch (error) {
    serverErrorMessage.value = resolveApiErrorMessage(
      error,
      'Unable to save the control implementation.',
    );

    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: serverErrorMessage.value,
      life: 4000,
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="isLoading && !controlImplementation"
      kind="loading"
      title="Loading"
      description="Loading the control implementation editor..."
    />

    <V2StatePanel
      v-else-if="loadErrorMessage"
      kind="error"
      title="Load failed"
      :description="loadErrorMessage"
    >
      <template #actions>
        <RouterLink
          :to="backTo"
          class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 font-bold text-[var(--ui-v2-foreground)]"
        >
          BACK
        </RouterLink>
      </template>
    </V2StatePanel>

    <SspEditorFormPage
      v-else
      :breadcrumbs="breadcrumbs"
      title="EDIT CONTROL IMPLEMENTATION"
      :form-id="formId"
      :back-to="backTo"
      submit-label="SAVE CONTROL IMPLEMENTATION"
      :submitting="isSaving"
      :errors="errorSummary"
      @submit="handleSubmit"
    >
      <SspEditorSection title="BASICS">
        <V2FormField
          label="DESCRIPTION"
          input-id="control-implementation-description"
          required
          :error="descriptionError"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="5"
              fluid
            />
          </template>
        </V2FormField>
      </SspEditorSection>

      <SspEditorSection title="SET PARAMETERS">
        <div class="space-y-4">
          <article
            v-for="(parameter, parameterIndex) in form.setParameters"
            :key="`parameter-${parameterIndex}`"
            class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-4"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeParameter(parameterIndex)"
              >
                REMOVE PARAMETER
              </button>
            </div>

            <V2FormField
              :input-id="`control-param-id-${parameterIndex}`"
              label="Parameter ID"
            >
              <template #default="fieldProps">
                <InputText
                  v-model="parameter.paramId"
                  :input-id="fieldProps.inputId"
                  :aria-describedby="fieldProps.describedBy"
                  :aria-invalid="fieldProps.invalid"
                  fluid
                />
              </template>
            </V2FormField>

            <div class="space-y-3">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                VALUES
              </p>

              <article
                v-for="(_, valueIndex) in parameter.values || []"
                :key="`parameter-${parameterIndex}-value-${valueIndex}`"
                class="grid gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
              >
                <V2FormField
                  :input-id="`control-param-value-${parameterIndex}-${valueIndex}`"
                  label="Value"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="parameter.values[valueIndex]"
                      :input-id="fieldProps.inputId"
                      :aria-describedby="fieldProps.describedBy"
                      :aria-invalid="fieldProps.invalid"
                      fluid
                    />
                  </template>
                </V2FormField>

                <button
                  type="button"
                  class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                  @click="removeParameterValue(parameterIndex, valueIndex)"
                >
                  REMOVE
                </button>
              </article>

              <button
                type="button"
                class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
                @click="addParameterValue(parameterIndex)"
              >
                ADD VALUE
              </button>
            </div>

            <V2FormField
              :input-id="`control-param-remarks-${parameterIndex}`"
              label="Remarks"
            >
              <template #default="fieldProps">
                <Textarea
                  v-model="parameter.remarks"
                  :input-id="fieldProps.inputId"
                  :aria-describedby="fieldProps.describedBy"
                  :aria-invalid="fieldProps.invalid"
                  rows="3"
                  fluid
                />
              </template>
            </V2FormField>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addParameter"
          >
            ADD PARAMETER
          </button>
        </div>
      </SspEditorSection>
    </SspEditorFormPage>
  </div>
</template>
