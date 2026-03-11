<template>
  <PageHeader>Risk Templates</PageHeader>
  <PageSubHeader>Administer reusable risk templates</PageSubHeader>

  <div class="mt-6">
    <div class="flex justify-end mb-4">
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
        <p class="p-6 text-red-500">Error loading risk templates.</p>
      </template>
      <template v-else-if="!templates?.length">
        <p class="p-6 text-gray-500 dark:text-slate-400">
          No risk templates found.
        </p>
      </template>
      <template v-else>
        <table class="w-full min-w-[980px] text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="text-left p-3 font-semibold">Template Title</th>
              <th class="text-left p-3 font-semibold">Description</th>
              <th class="text-left p-3 font-semibold">
                Default Likelihood/Impact
              </th>
              <th class="text-left p-3 font-semibold">Usage Count</th>
              <th class="text-left p-3 font-semibold">Created Date</th>
              <th class="text-left p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="template in templates"
              :key="getTemplateId(template)"
              class="border-t border-ccf-300 dark:border-slate-700"
            >
              <td class="p-3 font-medium text-gray-900 dark:text-slate-200">
                {{ template.title }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ template.description }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ formatLikelihoodImpact(template) }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ getUsageCount(template) }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ formatCreatedDate(template) }}
              </td>
              <td class="p-3">
                <div class="flex flex-wrap gap-2">
                  <TertiaryButton @click="openViewDialog(template)">
                    View
                  </TertiaryButton>
                  <TertiaryButton @click="openEditDialog(template)">
                    Edit
                  </TertiaryButton>
                  <TertiaryButton @click="duplicateTemplate(template)">
                    Duplicate
                  </TertiaryButton>
                  <TertiaryButton @click="confirmDeleteTemplate(template)">
                    Delete
                  </TertiaryButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
  </div>

  <Dialog
    v-model:visible="dialogVisible"
    modal
    size="lg"
    :header="dialogHeader"
    class="custom-colors"
  >
    <form @submit.prevent="submitTemplate" class="space-y-4 p-1">
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Title <span class="text-red-500">*</span>
        </label>
        <input
          v-model="formData.title"
          :disabled="isReadOnly"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter template title"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.description"
          :disabled="isReadOnly"
          rows="3"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter template description"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Default Status
          </label>
          <select
            v-model="formData.defaultStatus"
            :disabled="isReadOnly"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">Select status</option>
            <option
              v-for="status in statusOptions"
              :key="status"
              :value="status"
            >
              {{ status }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Default Likelihood
          </label>
          <select
            v-model="formData.defaultLikelihood"
            :disabled="isReadOnly"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">Select likelihood</option>
            <option
              v-for="likelihood in likelihoodOptions"
              :key="likelihood"
              :value="likelihood"
            >
              {{ likelihood }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Default Impact
          </label>
          <select
            v-model="formData.defaultImpact"
            :disabled="isReadOnly"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">Select impact</option>
            <option
              v-for="impact in impactOptions"
              :key="impact"
              :value="impact"
            >
              {{ impact }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Suggested Controls
        </label>
        <MultiSelect
          v-model="formData.suggestedControls"
          :options="availableControlOptions"
          :disabled="isReadOnly"
          :filter="true"
          :show-clear="true"
          placeholder="Select one or more controls"
          display="chip"
          class="w-full"
        />
        <div v-if="!isReadOnly" class="mt-2 flex gap-2">
          <input
            v-model="newControlOption"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="Add custom control suggestion"
            @keydown.enter.prevent="addControlOption"
          />
          <button
            type="button"
            class="px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600"
            @click="addControlOption"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Suggested Components
        </label>
        <MultiSelect
          v-model="formData.suggestedComponents"
          :options="availableComponentOptions"
          :disabled="isReadOnly"
          :filter="true"
          :show-clear="true"
          placeholder="Select one or more components"
          display="chip"
          class="w-full"
        />
        <div v-if="!isReadOnly" class="mt-2 flex gap-2">
          <input
            v-model="newComponentOption"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="Add custom component suggestion"
            @keydown.enter.prevent="addComponentOption"
          />
          <button
            type="button"
            class="px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600"
            @click="addComponentOption"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Template-specific Fields/Metadata (JSON object)
        </label>
        <textarea
          v-model="formData.metadataJson"
          :disabled="isReadOnly"
          rows="6"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md font-mono text-xs dark:bg-slate-800 dark:text-slate-300"
          placeholder='Example: {"statement":"Risk statement template","owner":"Risk Team"}'
        />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-gray-300 dark:border-slate-600"
          @click="dialogVisible = false"
        >
          {{ isReadOnly ? 'Close' : 'Cancel' }}
        </button>
        <PrimaryButton v-if="!isReadOnly" type="submit" :disabled="isSaving">
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
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Dialog from '@/volt/Dialog.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
  getRiskTemplateId,
  getRiskTemplateUsageCount,
  type RiskTemplate,
} from '@/types/risk-templates';

interface TemplateFormData {
  title: string;
  description: string;
  defaultStatus: string;
  defaultLikelihood: string;
  defaultImpact: string;
  suggestedControls: string[];
  suggestedComponents: string[];
  metadataJson: string;
}

type DialogMode = 'create' | 'edit' | 'view';

const statusOptions = [
  'open',
  'investigating',
  'remediating',
  'resolved',
  'risk-accepted',
  'mitigation-implemented',
  'mitigation-planned',
];

const likelihoodOptions = ['low', 'moderate', 'high', 'critical'];
const impactOptions = ['low', 'moderate', 'high', 'critical'];

const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>('create');
const selectedTemplateId = ref<string | null>(null);
const newControlOption = ref('');
const newComponentOption = ref('');
const availableControlOptions = ref<string[]>([]);
const availableComponentOptions = ref<string[]>([]);

const {
  data: templates,
  isLoading,
  error,
  execute: loadTemplates,
} = useDataApi<RiskTemplate[]>(
  '/api/admin/risk-templates',
  {},
  { immediate: true, initialData: [] },
);

const { execute: executeCreate, isLoading: isCreating } =
  useDataApi<RiskTemplate>(
    '/api/admin/risk-templates',
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: executeUpdate, isLoading: isUpdating } =
  useDataApi<RiskTemplate>(
    null,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: executeDelete } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const formData = ref<TemplateFormData>(createEmptyForm());

const dialogHeader = computed(() => {
  if (dialogMode.value === 'create') return 'Create Risk Template';
  if (dialogMode.value === 'edit') return 'Edit Risk Template';
  return 'View Risk Template';
});

const isReadOnly = computed(() => dialogMode.value === 'view');
const isSaving = computed(() => isCreating.value || isUpdating.value);

watch(
  templates,
  () => {
    syncSelectableOptions();
  },
  { immediate: true },
);

function createEmptyForm(): TemplateFormData {
  return {
    title: '',
    description: '',
    defaultStatus: '',
    defaultLikelihood: '',
    defaultImpact: '',
    suggestedControls: [],
    suggestedComponents: [],
    metadataJson: '',
  };
}

function getTemplateId(template: RiskTemplate): string {
  return getRiskTemplateId(template);
}

function getUsageCount(template: RiskTemplate): number {
  return getRiskTemplateUsageCount(template);
}

function formatCreatedDate(template: RiskTemplate): string {
  const rawDate = template.createdAt ?? template.createdDate;
  if (!rawDate) return 'N/A';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

function formatLikelihoodImpact(template: RiskTemplate): string {
  const likelihood = template.defaultLikelihood ?? 'N/A';
  const impact = template.defaultImpact ?? 'N/A';
  return `${likelihood} / ${impact}`;
}

function syncSelectableOptions() {
  const controlSet = new Set<string>();
  const componentSet = new Set<string>();

  for (const template of templates.value ?? []) {
    for (const control of template.suggestedControls ?? []) {
      controlSet.add(control);
    }
    for (const component of template.suggestedComponents ?? []) {
      componentSet.add(component);
    }
  }

  for (const control of formData.value.suggestedControls) {
    controlSet.add(control);
  }
  for (const component of formData.value.suggestedComponents) {
    componentSet.add(component);
  }

  availableControlOptions.value = [...controlSet].sort();
  availableComponentOptions.value = [...componentSet].sort();
}

function openCreateDialog() {
  dialogMode.value = 'create';
  selectedTemplateId.value = null;
  formData.value = createEmptyForm();
  newControlOption.value = '';
  newComponentOption.value = '';
  syncSelectableOptions();
  dialogVisible.value = true;
}

function openViewDialog(template: RiskTemplate) {
  dialogMode.value = 'view';
  selectedTemplateId.value = getTemplateId(template);
  setFormFromTemplate(template);
  dialogVisible.value = true;
}

function openEditDialog(template: RiskTemplate) {
  dialogMode.value = 'edit';
  selectedTemplateId.value = getTemplateId(template);
  setFormFromTemplate(template);
  dialogVisible.value = true;
}

function setFormFromTemplate(template: RiskTemplate) {
  formData.value = {
    title: template.title,
    description: template.description,
    defaultStatus: template.defaultStatus ?? '',
    defaultLikelihood: template.defaultLikelihood ?? '',
    defaultImpact: template.defaultImpact ?? '',
    suggestedControls: [...(template.suggestedControls ?? [])],
    suggestedComponents: [...(template.suggestedComponents ?? [])],
    metadataJson: template.metadata
      ? JSON.stringify(template.metadata, null, 2)
      : '',
  };
  newControlOption.value = '';
  newComponentOption.value = '';
  syncSelectableOptions();
}

function addOption(
  currentOptions: string[],
  selectedOptions: string[],
  newValue: string,
): string[] {
  const trimmed = newValue.trim();
  if (!trimmed) {
    return currentOptions;
  }

  const optionsSet = new Set(currentOptions);
  optionsSet.add(trimmed);

  if (!selectedOptions.includes(trimmed)) {
    selectedOptions.push(trimmed);
  }

  return [...optionsSet].sort();
}

function addControlOption() {
  availableControlOptions.value = addOption(
    availableControlOptions.value,
    formData.value.suggestedControls,
    newControlOption.value,
  );
  newControlOption.value = '';
}

function addComponentOption() {
  availableComponentOptions.value = addOption(
    availableComponentOptions.value,
    formData.value.suggestedComponents,
    newComponentOption.value,
  );
  newComponentOption.value = '';
}

function parseMetadata(
  metadataJson: string,
): Record<string, unknown> | undefined {
  const trimmed = metadataJson.trim();
  if (!trimmed) return undefined;

  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Metadata must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function buildTemplatePayload(): RiskTemplate {
  const metadata = parseMetadata(formData.value.metadataJson);

  return {
    title: formData.value.title.trim(),
    description: formData.value.description.trim(),
    defaultStatus: formData.value.defaultStatus || undefined,
    defaultLikelihood: formData.value.defaultLikelihood || undefined,
    defaultImpact: formData.value.defaultImpact || undefined,
    suggestedControls:
      formData.value.suggestedControls.length > 0
        ? formData.value.suggestedControls
        : undefined,
    suggestedComponents:
      formData.value.suggestedComponents.length > 0
        ? formData.value.suggestedComponents
        : undefined,
    metadata,
  };
}

async function submitTemplate() {
  if (!formData.value.title.trim() || !formData.value.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title and description are required.',
      life: 3000,
    });
    return;
  }

  try {
    const payload = buildTemplatePayload();

    if (dialogMode.value === 'create') {
      await executeCreate('/api/admin/risk-templates', { data: payload });
      toast.add({
        severity: 'success',
        summary: 'Template Created',
        detail: 'Risk template created successfully.',
        life: 3000,
      });
    } else if (dialogMode.value === 'edit') {
      if (!selectedTemplateId.value) {
        throw new Error('Missing template identifier for update.');
      }

      await executeUpdate(
        `/api/admin/risk-templates/${selectedTemplateId.value}`,
        {
          data: payload,
        },
      );
      toast.add({
        severity: 'success',
        summary: 'Template Updated',
        detail: 'Risk template updated successfully.',
        life: 3000,
      });
    }

    dialogVisible.value = false;
    await loadTemplates();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to save risk template.';
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: errorMessage,
      life: 4000,
    });
  }
}

async function duplicateTemplate(template: RiskTemplate) {
  try {
    const duplicatedTitle = `${template.title} (Copy)`;
    const payload: RiskTemplate = {
      title: duplicatedTitle,
      description: template.description,
      defaultStatus: template.defaultStatus,
      defaultLikelihood: template.defaultLikelihood,
      defaultImpact: template.defaultImpact,
      suggestedControls: template.suggestedControls
        ? [...template.suggestedControls]
        : undefined,
      suggestedComponents: template.suggestedComponents
        ? [...template.suggestedComponents]
        : undefined,
      metadata: template.metadata ? { ...template.metadata } : undefined,
    };

    await executeCreate('/api/admin/risk-templates', { data: payload });
    toast.add({
      severity: 'success',
      summary: 'Template Duplicated',
      detail: 'Risk template duplicated successfully.',
      life: 3000,
    });

    await loadTemplates();
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to duplicate risk template.';
    toast.add({
      severity: 'error',
      summary: 'Duplicate Failed',
      detail: errorMessage,
      life: 4000,
    });
  }
}

function confirmDeleteTemplate(template: RiskTemplate) {
  const usageCount = getUsageCount(template);
  const usageWarning =
    usageCount > 0
      ? `This template is currently used by ${usageCount} risk(s).`
      : '';

  confirm.require({
    header: 'Confirm Deletion',
    message: `Are you sure you want to delete the template "${template.title}"? ${usageWarning} This action cannot be undone.`,
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: async () => {
      await deleteTemplate(template);
    },
  });
}

async function deleteTemplate(template: RiskTemplate) {
  try {
    const templateId = getTemplateId(template);
    await executeDelete(`/api/admin/risk-templates/${templateId}`);
    toast.add({
      severity: 'success',
      summary: 'Template Deleted',
      detail: 'Risk template deleted successfully.',
      life: 3000,
    });
    await loadTemplates();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete template.';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: errorMessage,
      life: 4000,
    });
  }
}
</script>

<style>
.custom-colors .p-dialog-content {
  background-color: white;
  color: #1f2937;
}

.dark .custom-colors .p-dialog-content {
  background-color: #1f2937;
  color: #e5e7eb;
}
</style>
