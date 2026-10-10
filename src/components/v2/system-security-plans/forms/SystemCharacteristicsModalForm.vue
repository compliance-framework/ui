<script setup lang="ts">
// Edits the system information of an SSP (backlog M1-01).
//
// The characteristics PUT replaces associations it isn't given: a body with
// only the edited fields wipes the SSP's information types and system ids
// (verified 2026-10-10). So the request carries the current characteristics
// with only the edited fields changed, keys kebab-cased deeply. The PUT also
// skips empty strings, so an optional field that has a value can't be cleared;
// the form says so instead of pretending to clear it.
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { SystemCharacteristics } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';
import { useSspSubmitPermission } from '@/composables/v2/useSspSubmitPermission';
import { uuid } from '@/utils/uuid';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  characteristics: SystemCharacteristics;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [characteristics: SystemCharacteristics];
}>();

type EditableField =
  | 'systemName'
  | 'systemNameShort'
  | 'securitySensitivityLevel'
  | 'description'
  | 'remarks';

const REQUIRED: EditableField[] = ['systemName', 'description'];
const OPTIONAL: EditableField[] = [
  'systemNameShort',
  'securitySensitivityLevel',
  'remarks',
];
const LABELS: Record<EditableField, string> = {
  systemName: 'System name',
  systemNameShort: 'Short name',
  securitySensitivityLevel: 'Sensitivity level',
  description: 'Description',
  remarks: 'Remarks',
};

const toast = useToast();
const formId = `system-characteristics-form-${uuid()}`;

const form = reactive<Record<EditableField, string>>({
  systemName: '',
  systemNameShort: '',
  securitySensitivityLevel: '',
  description: '',
  remarks: '',
});
const fieldErrors = reactive<Record<EditableField | 'server', string>>({
  systemName: '',
  systemNameShort: '',
  securitySensitivityLevel: '',
  description: '',
  remarks: '',
  server: '',
});

watch(
  () => props.characteristics,
  (value) => {
    for (const field of [...REQUIRED, ...OPTIONAL]) {
      form[field] = String(value?.[field] ?? '');
    }
  },
  { immediate: true },
);

const errorSummary = computed(() => Object.values(fieldErrors).filter(Boolean));

const {
  data: savedCharacteristics,
  execute: saveCharacteristics,
  isLoading: saving,
} = useDataApi<SystemCharacteristics>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

function validate(): boolean {
  for (const key of Object.keys(fieldErrors) as Array<
    keyof typeof fieldErrors
  >) {
    fieldErrors[key] = '';
  }
  for (const field of REQUIRED) {
    if (!form[field].trim()) {
      fieldErrors[field] = `${LABELS[field]} is required.`;
    }
  }
  for (const field of OPTIONAL) {
    if (
      !form[field].trim() &&
      String(props.characteristics?.[field] ?? '').trim()
    ) {
      fieldErrors[field] =
        `${LABELS[field]} can't be cleared yet: the API keeps the previous value. Enter a replacement instead.`;
    }
  }
  const valid = !errorSummary.value.length;
  if (!valid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }
  return valid;
}

const { canSubmit, disabledReason } = useSspSubmitPermission(true);

async function submit(): Promise<void> {
  if (!canSubmit.value || !validate()) {
    return;
  }

  const edited: Partial<SystemCharacteristics> = {};
  for (const field of [...REQUIRED, ...OPTIONAL]) {
    const value = form[field].trim();
    if (value) {
      edited[field] = value;
    }
  }

  try {
    await saveCharacteristics(
      `/api/oscal/system-security-plans/${props.sspId}/system-characteristics`,
      { data: { ...cloneValue(props.characteristics), ...edited } },
    );
    toast.add({
      severity: 'success',
      summary: 'System Information Saved',
      detail: 'System characteristics updated successfully.',
      life: 2500,
    });
    emit('saved', savedCharacteristics.value ?? props.characteristics);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      'Unable to save the system characteristics.',
    );
  }
}
</script>

<template>
  <V2EditorDrawer
    title="EDIT SYSTEM INFORMATION"
    description="Update the system name, sensitivity level, description and remarks."
    submit-mode="save"
    :submitting="saving"
    :disable-submit="!canSubmit"
    :disabled-reason="disabledReason"
    :form-id="formId"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField
            label="SYSTEM NAME"
            input-id="system-characteristics-name"
            required
            :error="fieldErrors.systemName"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.systemName"
                :id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="SHORT NAME"
            input-id="system-characteristics-short-name"
            :error="fieldErrors.systemNameShort"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.systemNameShort"
                :id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField
          label="SENSITIVITY LEVEL"
          input-id="system-characteristics-sensitivity"
          helper-text="FIPS 199 level, for example low, moderate or high."
          :error="fieldErrors.securitySensitivityLevel"
        >
          <template #default="fieldProps">
            <InputText
              v-model="form.securitySensitivityLevel"
              :id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="DESCRIPTION"
          input-id="system-characteristics-description"
          required
          :error="fieldErrors.description"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="REMARKS"
          input-id="system-characteristics-remarks"
          :error="fieldErrors.remarks"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.remarks"
              :id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="3"
              fluid
            />
          </template>
        </V2FormField>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
