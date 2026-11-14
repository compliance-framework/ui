<script setup lang="ts">
/**
 * The subject template form (create, edit or duplicate), moved out of the classic list page so the
 * design-system list can show it in a dialog. It saves the template itself and emits `saved`.
 */
import { computed, ref } from 'vue';
import { isAxiosError, type AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import MultiSelect from '@/volt/MultiSelect.vue';
import Panel from '@/volt/Panel.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Select from '@/volt/Select.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import LabelSchemaBuilder from '@/components/subject-templates/LabelSchemaBuilder.vue';
import SelectorLabelsBuilder from '@/components/subject-templates/SelectorLabelsBuilder.vue';
import TemplatePreview from '@/components/subject-templates/TemplatePreview.vue';
import {
  buildUpsertSubjectTemplatePayload,
  DEFINED_COMPONENT_TYPE_OPTIONS,
  getDefinedComponentTypeLabel,
  SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS,
  SUBJECT_TEMPLATE_TYPE_OPTIONS,
  type SubjectTemplate,
  type SubjectTemplateFormData,
} from '@/types/subject-templates';

const props = defineProps<{
  initial: SubjectTemplateFormData;
  /** Set when editing; without it the form creates a template. */
  templateId?: string;
}>();
const emit = defineEmits<{ saved: []; cancel: [] }>();

const toast = useToast();
const formData = ref<SubjectTemplateFormData>(
  JSON.parse(JSON.stringify(props.initial)),
);

const { execute: executeCreate, isLoading: isCreating } =
  useDataApi<SubjectTemplate>(
    '/api/admin/subject-templates',
    { method: 'POST', transformRequest: [decamelizeKeys] },
    { immediate: false },
  );
const { execute: executeUpdate, isLoading: isUpdating } =
  useDataApi<SubjectTemplate>(
    null,
    { method: 'PUT', transformRequest: [decamelizeKeys] },
    { immediate: false },
  );
const isSaving = computed(() => isCreating.value || isUpdating.value);

const identityLabelKeyOptions = computed(() =>
  formData.value.labelSchema
    .map((schemaField) => schemaField.key.trim())
    .filter((key, index, list) => key.length > 0 && list.indexOf(key) === index)
    .map((key) => ({ label: key, value: key })),
);

function addProp() {
  formData.value.props.push({
    uuid: '',
    name: '',
    value: '',
    class: '',
    ns: '',
    remarks: '',
  });
}
function removeProp(index: number) {
  formData.value.props.splice(index, 1);
}
function addLink() {
  formData.value.links.push({ href: '', rel: '', text: '' });
}
function removeLink(index: number) {
  formData.value.links.splice(index, 1);
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isAxiosError(error)) {
    const body = (error as AxiosError<ErrorResponse<ErrorBody>>).response?.data
      ?.errors?.body;
    if (body) return body;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

async function submitTemplate() {
  try {
    const payload = buildUpsertSubjectTemplatePayload(formData.value);
    if (props.templateId) {
      await executeUpdate(`/api/admin/subject-templates/${props.templateId}`, {
        data: payload,
      });
      toast.add({
        severity: 'success',
        summary: 'Template updated',
        detail: 'Subject template updated successfully.',
        life: 3000,
      });
    } else {
      await executeCreate('/api/admin/subject-templates', { data: payload });
      toast.add({
        severity: 'success',
        summary: 'Template created',
        detail: 'Subject template created successfully.',
        life: 3000,
      });
    }
    emit('saved');
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: getApiErrorMessage(error, 'Failed to save subject template.'),
      life: 4000,
    });
  }
}
</script>

<template>
  <form @submit.prevent="submitTemplate" class="space-y-6 p-1">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Name <span class="text-red-500">*</span></label
        >
        <FormInput
          v-model="formData.name"
          :disabled="isSaving"
          required
          placeholder="Template name"
        />
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Type <span class="text-red-500">*</span></label
        >
        <Select
          v-model="formData.type"
          :options="SUBJECT_TEMPLATE_TYPE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          :disabled="isSaving"
          class="w-full"
        />
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Source Mode <span class="text-red-500">*</span></label
        >
        <Select
          v-model="formData.sourceMode"
          :options="SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          :disabled="isSaving"
          class="w-full"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label
          for="subject-template-display-priority"
          class="inline-block pb-1 dark:text-slate-300"
          >Display Priority</label
        >
        <FormInput
          id="subject-template-display-priority"
          v-model="formData.displayPriority"
          type="number"
          step="1"
          :disabled="isSaving"
          placeholder="0"
        />
      </div>

      <div class="md:col-span-2">
        <label class="inline-block pb-1 dark:text-slate-300"
          >Component Type</label
        >
        <Select
          v-model="formData.componentType"
          :options="DEFINED_COMPONENT_TYPE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          :placeholder="getDefinedComponentTypeLabel(null)"
          showClear
          :disabled="isSaving"
          class="w-full"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Title Template</label
        >
        <FormTextarea
          v-model="formData.titleTemplate"
          rows="2"
          :disabled="isSaving"
          placeholder="e.g. {{ repository }} ({{ branch }})"
        />
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Description Template</label
        >
        <FormTextarea
          v-model="formData.descriptionTemplate"
          rows="2"
          :disabled="isSaving"
          placeholder="Template with {{ label_key }} substitutions"
        />
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Purpose Template</label
        >
        <FormTextarea
          v-model="formData.purposeTemplate"
          rows="2"
          :disabled="isSaving"
          placeholder="Purpose template"
        />
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Remarks Template</label
        >
        <FormTextarea
          v-model="formData.remarksTemplate"
          rows="2"
          :disabled="isSaving"
          placeholder="Remarks template"
        />
      </div>
    </div>

    <LabelSchemaBuilder v-model="formData.labelSchema" :disabled="isSaving" />

    <div>
      <label class="inline-block pb-1 dark:text-slate-300 font-medium">
        Identity Label Keys <span class="text-red-500">*</span>
      </label>
      <p class="text-sm text-gray-500 dark:text-slate-400 mb-2">
        Choose keys from label schema used to uniquely identify a subject.
      </p>
      <MultiSelect
        v-model="formData.identityLabelKeys"
        :options="identityLabelKeyOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select identity keys"
        class="w-full"
        display="chip"
        filter
        :disabled="isSaving"
      />
    </div>

    <SelectorLabelsBuilder
      v-model="formData.selectorLabels"
      :disabled="isSaving"
    />

    <TemplatePreview
      :title-template="formData.titleTemplate"
      :description-template="formData.descriptionTemplate"
      :purpose-template="formData.purposeTemplate"
      :remarks-template="formData.remarksTemplate"
      :label-schema="formData.labelSchema"
      :disabled="isSaving"
    />

    <Panel toggleable collapsed>
      <template #header>
        <div>
          <h4 class="font-medium">Advanced</h4>
          <p class="text-sm text-gray-500 dark:text-slate-400">
            Optional OSCAL props and links.
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="inline-block pb-1 dark:text-slate-300 font-medium">
              Properties
            </label>
            <TertiaryButton type="button" :disabled="isSaving" @click="addProp">
              Add Property
            </TertiaryButton>
          </div>

          <p
            v-if="formData.props.length === 0"
            class="text-sm text-gray-500 dark:text-slate-400"
          >
            No properties configured.
          </p>

          <div
            v-for="(prop, index) in formData.props"
            :key="`prop-${index}`"
            class="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2"
          >
            <FormInput
              v-model="prop.name"
              :disabled="isSaving"
              placeholder="Name"
            />
            <FormInput
              v-model="prop.value"
              :disabled="isSaving"
              placeholder="Value"
            />
            <FormInput
              v-model="prop.class"
              :disabled="isSaving"
              placeholder="Class"
            />
            <FormInput
              v-model="prop.ns"
              :disabled="isSaving"
              placeholder="NS"
            />
            <FormInput
              v-model="prop.remarks"
              :disabled="isSaving"
              placeholder="Remarks"
            />
            <TertiaryButton
              type="button"
              :disabled="isSaving"
              @click="removeProp(index)"
            >
              Remove
            </TertiaryButton>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="inline-block pb-1 dark:text-slate-300 font-medium">
              Links
            </label>
            <TertiaryButton type="button" :disabled="isSaving" @click="addLink">
              Add Link
            </TertiaryButton>
          </div>

          <p
            v-if="formData.links.length === 0"
            class="text-sm text-gray-500 dark:text-slate-400"
          >
            No links configured.
          </p>

          <div
            v-for="(link, index) in formData.links"
            :key="`link-${index}`"
            class="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-2"
          >
            <FormInput
              v-model="link.href"
              :disabled="isSaving"
              placeholder="Href"
            />
            <FormInput
              v-model="link.rel"
              :disabled="isSaving"
              placeholder="Rel"
            />
            <FormInput
              v-model="link.text"
              :disabled="isSaving"
              placeholder="Text"
            />
            <TertiaryButton
              type="button"
              :disabled="isSaving"
              @click="removeLink(index)"
            >
              Remove
            </TertiaryButton>
          </div>
        </div>
      </div>
    </Panel>

    <div class="flex justify-end gap-3">
      <SecondaryButton
        type="button"
        :disabled="isSaving"
        @click="emit('cancel')"
      >
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : templateId ? 'Save' : 'Create' }}
      </PrimaryButton>
    </div>
  </form>
</template>
