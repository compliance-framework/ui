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
              <th class="text-left p-3 font-semibold">Statement</th>
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
              v-for="(template, index) in templates"
              :key="getTemplateKey(template) || `risk-template-${index}`"
              class="border-t border-ccf-300 dark:border-slate-700"
            >
              <td class="p-3 font-medium text-gray-900 dark:text-slate-200">
                {{ template.title }}
              </td>
              <td class="p-3 text-gray-600 dark:text-slate-400">
                {{ template.statement || 'N/A' }}
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Plugin ID <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.pluginId"
            :disabled="isReadOnly"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="e.g. aws-security-hub"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Policy Package <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.policyPackage"
            :disabled="isReadOnly"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="e.g. cis-aws-foundations"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Name <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.name"
            :disabled="isReadOnly"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="machine-friendly template name"
          />
        </div>
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
            placeholder="human-friendly title"
          />
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Statement <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.statement"
          :disabled="isReadOnly"
          rows="4"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
          placeholder="Risk statement text"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Likelihood Hint
          </label>
          <input
            v-model="formData.likelihoodHint"
            :disabled="isReadOnly"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="optional"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >
            Impact Hint
          </label>
          <input
            v-model="formData.impactHint"
            :disabled="isReadOnly"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
            placeholder="optional"
          />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400"
          >
            Violation IDs
          </label>
          <button
            v-if="!isReadOnly"
            type="button"
            class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-600"
            @click="addViolationId"
          >
            Add
          </button>
        </div>
        <div v-if="formData.violationIds.length" class="space-y-2">
          <div
            v-for="(_, index) in formData.violationIds"
            :key="`violation-${index}`"
            class="flex gap-2"
          >
            <input
              v-model="formData.violationIds[index]"
              :disabled="isReadOnly"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="e.g. SV-1234"
            />
            <button
              v-if="!isReadOnly"
              type="button"
              class="px-3 py-2 text-red-600"
              @click="removeViolationId(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-slate-400">
          No violation IDs.
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400"
          >
            Threat IDs
          </label>
          <button
            v-if="!isReadOnly"
            type="button"
            class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-600"
            @click="addThreatId"
          >
            Add
          </button>
        </div>
        <div v-if="formData.threatIds.length" class="space-y-3">
          <div
            v-for="(threat, index) in formData.threatIds"
            :key="`threat-${index}`"
            class="grid grid-cols-1 md:grid-cols-4 gap-2 border border-ccf-300 dark:border-slate-700 rounded p-2"
          >
            <input
              v-model="threat.system"
              :disabled="isReadOnly"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="System"
            />
            <input
              v-model="threat.id"
              :disabled="isReadOnly"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="ID"
            />
            <input
              v-model="threat.title"
              :disabled="isReadOnly"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="Title"
            />
            <div class="flex gap-2">
              <input
                v-model="threat.url"
                :disabled="isReadOnly"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
                placeholder="URL (optional)"
              />
              <button
                v-if="!isReadOnly"
                type="button"
                class="px-3 py-2 text-red-600"
                @click="removeThreatId(index)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-slate-400">
          No threat IDs.
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <input
            id="remediation-enabled"
            v-model="formData.enableRemediation"
            :disabled="isReadOnly"
            type="checkbox"
          />
          <label
            for="remediation-enabled"
            class="text-sm font-medium text-gray-700 dark:text-slate-400"
          >
            Include Remediation Template
          </label>
        </div>

        <div
          v-if="formData.enableRemediation"
          class="space-y-3 border border-ccf-300 dark:border-slate-700 rounded p-3"
        >
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >
              Remediation Title <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.remediationTitle"
              :disabled="isReadOnly"
              :required="formData.enableRemediation"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="Remediation template title"
            />
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >
              Remediation Description
            </label>
            <textarea
              v-model="formData.remediationDescription"
              :disabled="isReadOnly"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
              placeholder="Optional"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-slate-400"
              >
                Remediation Tasks
              </label>
              <button
                v-if="!isReadOnly"
                type="button"
                class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-slate-600"
                @click="addRemediationTask"
              >
                Add
              </button>
            </div>
            <div v-if="formData.remediationTasks.length" class="space-y-2">
              <div
                v-for="(task, index) in formData.remediationTasks"
                :key="`task-${index}`"
                class="flex gap-2"
              >
                <input
                  v-model="task.title"
                  :disabled="isReadOnly"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
                  :placeholder="`Task #${index + 1}`"
                />
                <button
                  v-if="!isReadOnly"
                  type="button"
                  class="px-3 py-2 text-red-600"
                  @click="removeRemediationTask(index)"
                >
                  Remove
                </button>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No remediation tasks.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Active State
        </label>
        <select
          v-model="formData.isActive"
          :disabled="isReadOnly"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="unset">Unset</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
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
import { computed, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { isAxiosError, type AxiosError } from 'axios';
import {
  getRiskTemplateApiId,
  getRiskTemplateKey,
  getRiskTemplateUsageCount,
  type RiskTemplate,
  type ThreatIDRequest,
  type UpsertRiskTemplateRequest,
} from '@/types/risk-templates';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

interface TemplateFormData {
  pluginId: string;
  policyPackage: string;
  name: string;
  title: string;
  statement: string;
  likelihoodHint: string;
  impactHint: string;
  violationIds: string[];
  threatIds: ThreatIDRequest[];
  enableRemediation: boolean;
  remediationTitle: string;
  remediationDescription: string;
  remediationTasks: Array<{
    title: string;
    orderIndex: number;
  }>;
  isActive: 'unset' | 'true' | 'false';
}

type DialogMode = 'create' | 'edit' | 'view';

const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const dialogMode = ref<DialogMode>('create');
const selectedTemplateId = ref<string | null>(null);

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

function createEmptyForm(): TemplateFormData {
  return {
    pluginId: '',
    policyPackage: '',
    name: '',
    title: '',
    statement: '',
    likelihoodHint: '',
    impactHint: '',
    violationIds: [],
    threatIds: [],
    enableRemediation: false,
    remediationTitle: '',
    remediationDescription: '',
    remediationTasks: [],
    isActive: 'unset',
  };
}

function getTemplateApiId(template: RiskTemplate): string | undefined {
  return getRiskTemplateApiId(template);
}

function getTemplateKey(template: RiskTemplate): string {
  return getRiskTemplateKey(template);
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
  const likelihood = template.likelihoodHint ?? 'N/A';
  const impact = template.impactHint ?? 'N/A';
  return `${likelihood} / ${impact}`;
}

function openCreateDialog() {
  dialogMode.value = 'create';
  selectedTemplateId.value = null;
  formData.value = createEmptyForm();
  dialogVisible.value = true;
}

function openViewDialog(template: RiskTemplate) {
  dialogMode.value = 'view';
  selectedTemplateId.value = getTemplateApiId(template) ?? null;
  setFormFromTemplate(template);
  dialogVisible.value = true;
}

function openEditDialog(template: RiskTemplate) {
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
  setFormFromTemplate(template);
  dialogVisible.value = true;
}

function setFormFromTemplate(template: RiskTemplate) {
  formData.value = {
    pluginId: template.pluginId ?? '',
    policyPackage: template.policyPackage ?? '',
    name: template.name ?? '',
    title: template.title,
    statement: template.statement ?? '',
    likelihoodHint: template.likelihoodHint ?? '',
    impactHint: template.impactHint ?? '',
    violationIds: [...(template.violationIds ?? [])],
    threatIds: (template.threatIds ?? []).map((threat) => ({
      system: threat.system,
      id: threat.id,
      title: threat.title,
      url: threat.url ?? '',
    })),
    enableRemediation: !!template.remediationTemplate,
    remediationTitle: template.remediationTemplate?.title ?? '',
    remediationDescription: template.remediationTemplate?.description ?? '',
    remediationTasks: (template.remediationTemplate?.tasks ?? []).map(
      (task, index) => ({
        title: task.title,
        orderIndex: task.orderIndex ?? index,
      }),
    ),
    isActive:
      template.isActive === undefined
        ? 'unset'
        : template.isActive
          ? 'true'
          : 'false',
  };
}

function addViolationId() {
  formData.value.violationIds.push('');
}

function removeViolationId(index: number) {
  formData.value.violationIds.splice(index, 1);
}

function addThreatId() {
  formData.value.threatIds.push({
    system: '',
    id: '',
    title: '',
    url: '',
  });
}

function removeThreatId(index: number) {
  formData.value.threatIds.splice(index, 1);
}

function addRemediationTask() {
  formData.value.remediationTasks.push({
    title: '',
    orderIndex: formData.value.remediationTasks.length,
  });
}

function removeRemediationTask(index: number) {
  formData.value.remediationTasks.splice(index, 1);
  formData.value.remediationTasks.forEach((task, taskIndex) => {
    task.orderIndex = taskIndex;
  });
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildTemplatePayload(): UpsertRiskTemplateRequest {
  const violationIds = formData.value.violationIds
    .map((violationId) => violationId.trim())
    .filter((violationId) => violationId.length > 0);

  const threatIds = formData.value.threatIds
    .map((threat) => ({
      system: threat.system.trim(),
      id: threat.id.trim(),
      title: threat.title.trim(),
      url: toOptionalString(threat.url ?? ''),
    }))
    .filter(
      (threat) =>
        threat.system.length > 0 ||
        threat.id.length > 0 ||
        threat.title.length > 0 ||
        !!threat.url,
    );

  for (const threat of threatIds) {
    if (!threat.system || !threat.id || !threat.title) {
      throw new Error(
        'Threat IDs must include system, id, and title when provided.',
      );
    }
  }

  let remediationTemplate: UpsertRiskTemplateRequest['remediationTemplate'];
  if (formData.value.enableRemediation) {
    const remediationTitle = formData.value.remediationTitle.trim();
    if (!remediationTitle) {
      throw new Error('Remediation title is required when remediation is set.');
    }

    const remediationTasks = formData.value.remediationTasks
      .map((task, index) => ({
        title: task.title.trim(),
        orderIndex: index,
      }))
      .filter((task) => task.title.length > 0);

    remediationTemplate = {
      title: remediationTitle,
      description: toOptionalString(formData.value.remediationDescription),
      tasks: remediationTasks.length ? remediationTasks : undefined,
    };
  }

  const isActive =
    formData.value.isActive === 'unset'
      ? undefined
      : formData.value.isActive === 'true';

  return {
    pluginId: formData.value.pluginId.trim(),
    policyPackage: formData.value.policyPackage.trim(),
    name: formData.value.name.trim(),
    title: formData.value.title.trim(),
    statement: formData.value.statement.trim(),
    likelihoodHint: toOptionalString(formData.value.likelihoodHint),
    impactHint: toOptionalString(formData.value.impactHint),
    violationIds: violationIds.length ? violationIds : undefined,
    threatIds: threatIds.length ? threatIds : undefined,
    remediationTemplate,
    isActive,
  };
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
  if (dialogMode.value === 'view') {
    return;
  }

  if (
    !formData.value.pluginId.trim() ||
    !formData.value.policyPackage.trim() ||
    !formData.value.name.trim() ||
    !formData.value.title.trim() ||
    !formData.value.statement.trim()
  ) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail:
        'Plugin ID, policy package, name, title, and statement are required.',
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
    const errorMessage = getApiErrorMessage(
      error,
      'Failed to save risk template.',
    );
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
    if (
      !template.pluginId?.trim() ||
      !template.policyPackage?.trim() ||
      !template.name?.trim() ||
      !template.statement?.trim()
    ) {
      throw new Error(
        'Template is missing required fields (pluginId, policyPackage, name, or statement) and cannot be duplicated.',
      );
    }

    const duplicatedTitle = `${template.title} (Copy)`;
    const payload: UpsertRiskTemplateRequest = {
      pluginId: template.pluginId,
      policyPackage: template.policyPackage,
      name: `${template.name}-copy`,
      title: duplicatedTitle,
      statement: template.statement,
      likelihoodHint: template.likelihoodHint,
      impactHint: template.impactHint,
      violationIds: template.violationIds
        ? [...template.violationIds]
        : undefined,
      threatIds: template.threatIds
        ? template.threatIds.map((threat) => ({ ...threat }))
        : undefined,
      remediationTemplate: template.remediationTemplate
        ? {
            title: template.remediationTemplate.title,
            description: template.remediationTemplate.description,
            tasks: template.remediationTemplate.tasks?.map((task) => ({
              ...task,
            })),
          }
        : undefined,
      isActive: template.isActive,
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
    const errorMessage = getApiErrorMessage(
      error,
      'Failed to duplicate risk template.',
    );
    toast.add({
      severity: 'error',
      summary: 'Duplicate Failed',
      detail: errorMessage,
      life: 4000,
    });
  }
}

function confirmDeleteTemplate(template: RiskTemplate) {
  const templateId = getTemplateApiId(template);
  if (!templateId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Template',
      detail: 'Template is missing an identifier and cannot be deleted.',
      life: 3000,
    });
    return;
  }

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
    const templateId = getTemplateApiId(template);
    if (!templateId) {
      throw new Error(
        'Template is missing an identifier and cannot be deleted.',
      );
    }

    await executeDelete(`/api/admin/risk-templates/${templateId}`);
    toast.add({
      severity: 'success',
      summary: 'Template Deleted',
      detail: 'Risk template deleted successfully.',
      life: 3000,
    });
    await loadTemplates();
  } catch (error) {
    const errorMessage = getApiErrorMessage(
      error,
      'Failed to delete template.',
    );
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
