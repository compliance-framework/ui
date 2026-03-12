<template>
  <PageHeader>Subject Templates</PageHeader>
  <PageSubHeader>Administer reusable subject templates</PageSubHeader>

  <div class="mt-6 space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-56">
        <label class="inline-block pb-1 text-sm dark:text-slate-300"
          >Search</label
        >
        <InputText
          v-model="searchQuery"
          placeholder="Search by template name"
          class="w-full"
        />
      </div>

      <div class="min-w-52">
        <label class="inline-block pb-1 text-sm dark:text-slate-300"
          >Type</label
        >
        <Select
          v-model="typeFilter"
          :options="SUBJECT_TEMPLATE_TYPE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          showClear
          placeholder="All types"
          class="w-full"
        />
      </div>

      <div class="min-w-52">
        <label class="inline-block pb-1 text-sm dark:text-slate-300"
          >Source Mode</label
        >
        <Select
          v-model="sourceModeFilter"
          :options="SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          showClear
          placeholder="All source modes"
          class="w-full"
        />
      </div>

      <PrimaryButton @click="openCreateDialog">Create Template</PrimaryButton>
    </div>

    <div
      class="rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 overflow-x-auto"
    >
      <template v-if="isLoading">
        <p class="p-6 text-gray-500 dark:text-slate-400">
          Loading templates...
        </p>
      </template>

      <template v-else-if="error">
        <p class="p-6 text-red-500">Error loading subject templates.</p>
      </template>

      <template v-else-if="filteredTemplates.length === 0">
        <p class="p-6 text-gray-500 dark:text-slate-400">
          {{
            templates && templates.length > 0
              ? 'No templates match the current filters.'
              : 'No subject templates found.'
          }}
        </p>
      </template>

      <template v-else>
        <table class="w-full min-w-[1200px] text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="text-left p-3 font-semibold">Name</th>
              <th class="text-left p-3 font-semibold">Type</th>
              <th class="text-left p-3 font-semibold">Source Mode</th>
              <th class="text-left p-3 font-semibold">Selector Labels</th>
              <th class="text-left p-3 font-semibold">Updated</th>
              <th class="text-left p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(template, index) in paginatedTemplates"
              :key="getTemplateKey(template) || `subject-template-${index}`"
              class="border-t border-ccf-300 dark:border-slate-700"
            >
              <td class="p-3 font-medium text-gray-900 dark:text-slate-200">
                {{ template.name || 'N/A' }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ getTypeLabel(template.type) }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ getSourceModeLabel(template.sourceMode) }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                <div class="flex flex-wrap gap-2">
                  <Chip
                    v-for="(
                      selectorLabel, selectorIndex
                    ) in template.selectorLabels"
                    :key="`${selectorLabel.key}-${selectorLabel.value}-${selectorIndex}`"
                    :label="`${selectorLabel.key}: ${selectorLabel.value}`"
                  />
                  <span v-if="!template.selectorLabels?.length">-</span>
                </div>
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{
                  formatSubjectTemplateDate(
                    template.updatedAt || template.createdAt,
                  )
                }}
              </td>
              <td class="p-3">
                <div class="flex flex-wrap gap-2">
                  <RouterLinkButton
                    v-if="getTemplateApiId(template)"
                    :to="{
                      name: 'admin-subject-template-detail',
                      params: { id: getTemplateApiId(template) || '' },
                    }"
                  >
                    View
                  </RouterLinkButton>
                  <TertiaryButton v-else disabled>View</TertiaryButton>
                  <TertiaryButton @click="openEditDialog(template)">
                    Edit
                  </TertiaryButton>
                  <TertiaryButton @click="duplicateTemplate(template)">
                    Duplicate
                  </TertiaryButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <div
      v-if="filteredTemplates.length > 0"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-gray-500 dark:text-slate-400">
        Showing {{ pageStart }}-{{ pageEnd }} of {{ filteredTemplates.length }}
      </p>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-slate-400">Rows:</span>
        <Select
          v-model="pageSize"
          :options="pageSizeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-24"
        />
      </div>

      <div class="flex items-center gap-2">
        <TertiaryButton :disabled="currentPage <= 1" @click="currentPage -= 1">
          Previous
        </TertiaryButton>
        <span class="text-sm text-gray-600 dark:text-slate-300">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <TertiaryButton
          :disabled="currentPage >= totalPages"
          @click="currentPage += 1"
        >
          Next
        </TertiaryButton>
      </div>
    </div>
  </div>

  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="dialogHeader"
    class="w-full max-w-5xl"
  >
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
              <TertiaryButton
                type="button"
                :disabled="isSaving"
                @click="addProp"
              >
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
              <TertiaryButton
                type="button"
                :disabled="isSaving"
                @click="addLink"
              >
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
          @click="dialogVisible = false"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" :disabled="isSaving">
          {{
            isSaving ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Save'
          }}
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isAxiosError, type AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import Chip from '@/volt/Chip.vue';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Panel from '@/volt/Panel.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
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
  createEmptySubjectTemplateForm,
  createSubjectTemplateFormFromTemplate,
  formatSubjectTemplateDate,
  generateUniqueSubjectTemplateCopyName,
  getSubjectTemplateApiId,
  getSubjectTemplateKey,
  getSubjectTemplateSourceModeLabel,
  getSubjectTemplateTypeLabel,
  SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS,
  SUBJECT_TEMPLATE_TYPE_OPTIONS,
  type SubjectTemplate,
  type SubjectTemplateFormData,
  type SubjectTemplateSourceMode,
  type SubjectTemplateType,
} from '@/types/subject-templates';

type DialogMode = 'create' | 'edit';

const toast = useToast();
const route = useRoute();
const router = useRouter();

const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>('create');
const selectedTemplateId = ref<string | null>(null);
const formData = ref<SubjectTemplateFormData>(createEmptySubjectTemplateForm());

const searchQuery = ref('');
const typeFilter = ref<SubjectTemplateType | null>(null);
const sourceModeFilter = ref<SubjectTemplateSourceMode | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
];

const {
  data: templates,
  isLoading,
  error,
  execute: loadTemplates,
} = useDataApi<SubjectTemplate[]>(
  '/api/subject-templates',
  {},
  { immediate: true, initialData: [] },
);

const { execute: executeCreate, isLoading: isCreating } =
  useDataApi<SubjectTemplate>(
    '/api/subject-templates',
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: executeUpdate, isLoading: isUpdating } =
  useDataApi<SubjectTemplate>(
    null,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const dialogHeader = computed(() => {
  return dialogMode.value === 'create'
    ? 'Create Subject Template'
    : 'Edit Subject Template';
});

const isSaving = computed(() => isCreating.value || isUpdating.value);

const filteredTemplates = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return (templates.value ?? []).filter((template) => {
    const matchesSearch = query
      ? (template.name ?? '').toLowerCase().includes(query)
      : true;

    const matchesType = typeFilter.value
      ? template.type === typeFilter.value
      : true;

    const matchesSourceMode = sourceModeFilter.value
      ? template.sourceMode === sourceModeFilter.value
      : true;

    return matchesSearch && matchesType && matchesSourceMode;
  });
});

const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(filteredTemplates.value.length / pageSize.value),
  );
});

const paginatedTemplates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTemplates.value.slice(start, start + pageSize.value);
});

const pageStart = computed(() => {
  if (filteredTemplates.value.length === 0) {
    return 0;
  }

  return (currentPage.value - 1) * pageSize.value + 1;
});

const pageEnd = computed(() => {
  if (filteredTemplates.value.length === 0) {
    return 0;
  }

  return Math.min(
    currentPage.value * pageSize.value,
    filteredTemplates.value.length,
  );
});

const identityLabelKeyOptions = computed(() => {
  const keyOptions = formData.value.labelSchema
    .map((schemaField) => schemaField.key.trim())
    .filter((key, index, list) => key.length > 0 && list.indexOf(key) === index)
    .map((key) => ({
      label: key,
      value: key,
    }));

  return keyOptions;
});

watch([searchQuery, typeFilter, sourceModeFilter, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages) {
    currentPage.value = newTotalPages;
  }
});

watch(
  () => error.value,
  (err) => {
    if (!err) {
      return;
    }

    const status = (err as AxiosError).response?.status;
    if (status === 403) {
      toast.add({
        severity: 'warn',
        summary: 'Insufficient permissions',
        detail: "You don't have access to subject templates.",
        life: 4000,
      });
    }
  },
);

watch(
  [() => templates.value, () => route.query.edit],
  () => {
    const editId = route.query.edit;
    if (typeof editId !== 'string' || !templates.value) {
      return;
    }

    const template = templates.value.find(
      (entry) => getTemplateApiId(entry) === editId,
    );
    if (!template) {
      if (!isLoading.value) {
        toast.add({
          severity: 'error',
          summary: 'Template Not Found',
          detail: 'Unable to open template editor from link.',
          life: 4000,
        });
        clearEditQuery();
      }
      return;
    }

    openEditDialog(template);
    clearEditQuery();
  },
  { immediate: true },
);

function clearEditQuery() {
  if (typeof route.query.edit !== 'string') {
    return;
  }

  const query = { ...route.query };
  delete query.edit;
  router.replace({ query });
}

function getTemplateApiId(template: SubjectTemplate): string | undefined {
  return getSubjectTemplateApiId(template);
}

function getTemplateKey(template: SubjectTemplate): string {
  return getSubjectTemplateKey(template);
}

function getTypeLabel(type?: SubjectTemplateType): string {
  return getSubjectTemplateTypeLabel(type);
}

function getSourceModeLabel(sourceMode?: SubjectTemplateSourceMode): string {
  return getSubjectTemplateSourceModeLabel(sourceMode);
}

function openCreateDialog() {
  dialogMode.value = 'create';
  selectedTemplateId.value = null;
  formData.value = createEmptySubjectTemplateForm();
  dialogVisible.value = true;
}

function openEditDialog(template: SubjectTemplate) {
  const templateId = getTemplateApiId(template);
  if (!templateId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Template',
      detail: 'Template is missing an identifier and cannot be edited.',
      life: 3000,
    });
    return;
  }

  dialogMode.value = 'edit';
  selectedTemplateId.value = templateId;
  formData.value = createSubjectTemplateFormFromTemplate(template);
  dialogVisible.value = true;
}

function duplicateTemplate(template: SubjectTemplate) {
  if (!template.name?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Template',
      detail: 'Template is missing a name and cannot be duplicated.',
      life: 3000,
    });
    return;
  }

  const duplicatedForm = createSubjectTemplateFormFromTemplate(template);
  const existingNames = (templates.value ?? [])
    .map((entry) => entry.name ?? '')
    .filter((name) => name.trim().length > 0);

  duplicatedForm.name = generateUniqueSubjectTemplateCopyName(
    template.name,
    existingNames,
  );

  dialogMode.value = 'create';
  selectedTemplateId.value = null;
  formData.value = duplicatedForm;
  dialogVisible.value = true;
}

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
  formData.value.links.push({
    href: '',
    rel: '',
    text: '',
  });
}

function removeLink(index: number) {
  formData.value.links.splice(index, 1);
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse<ErrorBody>>;
    const responseBody = axiosError.response?.data?.errors?.body;
    if (responseBody) {
      return responseBody;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function submitTemplate() {
  try {
    const payload = buildUpsertSubjectTemplatePayload(formData.value);

    if (dialogMode.value === 'create') {
      await executeCreate('/api/subject-templates', { data: payload });
      toast.add({
        severity: 'success',
        summary: 'Template Created',
        detail: 'Subject template created successfully.',
        life: 3000,
      });
    } else {
      if (!selectedTemplateId.value) {
        throw new Error('Template identifier is missing for update.');
      }

      await executeUpdate(
        `/api/subject-templates/${selectedTemplateId.value}`,
        {
          data: payload,
        },
      );
      toast.add({
        severity: 'success',
        summary: 'Template Updated',
        detail: 'Subject template updated successfully.',
        life: 3000,
      });
    }

    dialogVisible.value = false;
    await loadTemplates();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: getApiErrorMessage(error, 'Failed to save subject template.'),
      life: 4000,
    });
  }
}
</script>
