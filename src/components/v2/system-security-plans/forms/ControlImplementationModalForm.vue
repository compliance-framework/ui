<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
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
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorAddButton from '@/components/v2/system-security-plans/forms/SspEditorAddButton.vue';
import SspEditorCollectionSection from '@/components/v2/system-security-plans/forms/SspEditorCollectionSection.vue';
import SspEditorCompactField from '@/components/v2/system-security-plans/forms/SspEditorCompactField.vue';
import SspEditorRemoveButton from '@/components/v2/system-security-plans/forms/SspEditorRemoveButton.vue';
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
    description="Refine the control narrative and parameter values for the selected implementation."
    :form-id="formId"
    submit-mode="save"
    :submitting="saving"
    width-class="w-screen! sm:w-[94vw]! lg:w-[760px]!"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
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
        <SspEditorCollectionSection title="SET PARAMETERS">
          <div
            v-if="form.setParameters?.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(parameter, parameterIndex) in form.setParameters || []"
              :key="`parameter-${parameterIndex}`"
              class="space-y-3 px-3 py-2.5"
            >
              <div
                class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              >
                <SspEditorCompactField
                  :input-id="`control-param-id-${parameterIndex}`"
                  label="PARAMETER ID"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="parameter.paramId"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorRemoveButton
                  label="REMOVE PARAMETER"
                  @click="removeParameter(parameterIndex)"
                />
              </div>

              <div class="space-y-2">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  VALUES
                </p>

                <div
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
                >
                  <div
                    v-if="parameter.values?.length"
                    class="divide-y divide-[var(--ui-v2-border)]"
                  >
                    <div
                      v-for="(_, valueIndex) in parameter.values || []"
                      :key="`parameter-${parameterIndex}-value-${valueIndex}`"
                      class="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
                    >
                      <SspEditorCompactField
                        :input-id="`control-param-value-${parameterIndex}-${valueIndex}`"
                        label="VALUE"
                      >
                        <template #default="fieldProps">
                          <InputText
                            v-model="parameter.values[valueIndex]"
                            :input-id="fieldProps.inputId"
                            fluid
                          />
                        </template>
                      </SspEditorCompactField>

                      <SspEditorRemoveButton
                        @click="
                          removeParameterValue(parameterIndex, valueIndex)
                        "
                      />
                    </div>
                  </div>

                  <div v-else class="px-4 py-4">
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      No values added.
                    </p>
                  </div>

                  <div
                    class="border-t border-[var(--ui-v2-border)] px-3 py-2.5"
                  >
                    <SspEditorAddButton
                      label="ADD VALUE"
                      @click="addParameterValue(parameterIndex)"
                    />
                  </div>
                </div>
              </div>

              <V2FormField
                :input-id="`control-param-remarks-${parameterIndex}`"
                label="REMARKS"
              >
                <template #default="fieldProps">
                  <Textarea
                    v-model="parameter.remarks"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid
                  />
                </template>
              </V2FormField>
            </article>
          </div>

          <div v-else class="px-4 py-4">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
            >
              No parameters added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD PARAMETER" @click="addParameter" />
          </template>
        </SspEditorCollectionSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
