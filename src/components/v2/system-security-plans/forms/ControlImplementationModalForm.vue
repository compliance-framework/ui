<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import DangerButton from '@/volt/DangerButton.vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import type { ControlImplementation } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  focusFirstInvalidField,
  toErrorSummaryItems,
} from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  controlImplementation: ControlImplementation;
}>();
const emit = defineEmits<{
  cancel: [];
  saved: [controlImplementation: ControlImplementation];
}>();

const toast = useToast();
const formId = `control-implementation-form-${crypto.randomUUID()}`;
const fieldErrors = reactive({ description: '', server: '' });
const form = reactive<ControlImplementation>({
  description: '',
  setParameters: [],
  implementedRequirements: [],
});

const {
  data: persistedControlImplementation,
  execute: saveControlImplementation,
  isLoading: saving,
} = useDataApi<ControlImplementation>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const errorSummary = computed(() =>
  toErrorSummaryItems([
    {
      fieldId: 'control-implementation-description',
      message: fieldErrors.description,
    },
    { message: fieldErrors.server },
  ]).map((item) => item.message),
);

watch(
  () => props.controlImplementation,
  (value) => {
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
  },
  { immediate: true },
);

function addParameter(): void {
  (form.setParameters ||= []).push({ paramId: '', values: [''], remarks: '' });
}
function removeParameter(index: number): void {
  (form.setParameters ||= []).splice(index, 1);
}
function addParameterValue(parameterIndex: number): void {
  form.setParameters?.[parameterIndex]?.values.push('');
}
function removeParameterValue(
  parameterIndex: number,
  valueIndex: number,
): void {
  form.setParameters?.[parameterIndex]?.values.splice(valueIndex, 1);
}

function validate(): boolean {
  fieldErrors.description = '';
  fieldErrors.server = '';
  if (!form.description.trim())
    fieldErrors.description = 'Description is required.';
  const valid = !fieldErrors.description;
  if (!valid)
    focusFirstInvalidField(document.getElementById(formId) || document);
  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) return;
  try {
    await saveControlImplementation(
      `/api/oscal/system-security-plans/${props.sspId}/control-implementation`,
      { data: form },
    );
    toast.add({
      severity: 'success',
      summary: 'Control Implementation Saved',
      detail: 'Control implementation updated successfully.',
      life: 2500,
    });
    emit('saved', persistedControlImplementation.value || form);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      'Unable to save the control implementation.',
    );
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: fieldErrors.server,
      life: 4000,
    });
  }
}
</script>

<template>
  <V2EditorDrawer
    title="EDIT CONTROL IMPLEMENTATION"
    :form-id="formId"
    submit-label="SAVE CONTROL IMPLEMENTATION"
    :submitting="saving"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <SspEditorSection variant="plain" title="BASICS">
          <V2FormField
            label="DESCRIPTION"
            input-id="control-implementation-description"
            required
            :error="fieldErrors.description"
          >
            <template #default="fieldProps"
              ><Textarea
                v-model="form.description"
                :input-id="fieldProps.inputId"
                rows="5"
                fluid
            /></template>
          </V2FormField>
        </SspEditorSection>
        <SspEditorSection variant="plain" title="SET PARAMETERS">
          <div class="space-y-4">
            <article
              v-for="(parameter, parameterIndex) in form.setParameters"
              :key="`parameter-${parameterIndex}`"
              class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeParameter(parameterIndex)"
                  >REMOVE PARAMETER</DangerButton
                >
              </div>
              <V2FormField
                :input-id="`control-param-id-${parameterIndex}`"
                label="Parameter ID"
                ><template #default="fieldProps"
                  ><InputText
                    v-model="parameter.paramId"
                    :input-id="fieldProps.inputId"
                    fluid /></template
              ></V2FormField>
              <div class="space-y-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  VALUES
                </p>
                <article
                  v-for="(_, valueIndex) in parameter.values || []"
                  :key="`parameter-${parameterIndex}-value-${valueIndex}`"
                  class="grid gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
                >
                  <V2FormField
                    :input-id="`control-param-value-${parameterIndex}-${valueIndex}`"
                    label="Value"
                    ><template #default="fieldProps"
                      ><InputText
                        v-model="parameter.values[valueIndex]"
                        :input-id="fieldProps.inputId"
                        fluid /></template></V2FormField
                  ><DangerButton
                    type="button"
                    size="small"
                    @click="removeParameterValue(parameterIndex, valueIndex)"
                    >REMOVE</DangerButton
                  >
                </article>
                <SecondaryButton
                  type="button"
                  size="small"
                  @click="addParameterValue(parameterIndex)"
                  >ADD VALUE</SecondaryButton
                >
              </div>
              <V2FormField
                :input-id="`control-param-remarks-${parameterIndex}`"
                label="Remarks"
                ><template #default="fieldProps"
                  ><Textarea
                    v-model="parameter.remarks"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid /></template
              ></V2FormField>
            </article>
            <SecondaryButton type="button" size="small" @click="addParameter"
              >ADD PARAMETER</SecondaryButton
            >
          </div>
        </SspEditorSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
