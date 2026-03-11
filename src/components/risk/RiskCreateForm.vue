<template>
  <div class="p-6">
    <form @submit.prevent="submit" class="space-y-4">
      <div
        class="p-4 rounded-md border border-ccf-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p class="text-sm text-gray-600 dark:text-slate-400">
            Optionally pre-fill this form from a reusable risk template.
          </p>
          <button
            type="button"
            @click="openTemplateSelector"
            :disabled="templatesAccessDenied"
            class="px-3 py-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
          >
            {{
              templatesAccessDenied ? 'Templates Unavailable' : 'Use Template'
            }}
          </button>
        </div>
        <p
          v-if="templatesAccessDenied"
          class="mt-2 text-sm text-amber-700 dark:text-amber-300"
        >
          You do not have permission to use risk templates.
        </p>
        <p
          v-if="selectedTemplateName"
          class="mt-2 text-sm text-blue-700 dark:text-blue-300"
        >
          Using template: {{ selectedTemplateName }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Title <span class="text-red-500">*</span>
        </label>
        <input
          v-model="formData.title"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk title"
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
          required
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk description"
        ></textarea>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Statement <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.statement"
          required
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter risk statement"
        ></textarea>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Status <span class="text-red-500">*</span>
        </label>
        <select
          v-model="formData.status"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">Select status</option>
          <option
            v-for="status in riskStatusOptions"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Threat IDs
        </label>
        <div class="space-y-2">
          <div
            v-for="(threatId, index) in formData.threatIds"
            :key="index"
            class="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1.2fr_auto] gap-2"
          >
            <input
              v-model="formData.threatIds[index].id"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Threat ID"
            />
            <input
              v-model="formData.threatIds[index].system"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="System URI"
            />
            <input
              v-model="formData.threatIds[index].href"
              type="text"
              class="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Reference URL (optional)"
            />
            <button
              type="button"
              @click="removeThreatId(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <p
            v-if="!formData.threatIds.length"
            class="text-xs text-gray-500 dark:text-slate-400"
          >
            No threat identifiers added.
          </p>
          <button
            type="button"
            @click="addThreatId"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Threat ID
          </button>
        </div>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Deadline
        </label>
        <input
          v-model="formData.deadline"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
        >
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter additional remarks (optional)"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="
            !formData.title ||
            !formData.description ||
            !formData.statement ||
            !formData.status ||
            saving
          "
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </div>
    </form>

    <Dialog
      v-model:visible="showTemplateSelector"
      modal
      size="lg"
      header="Select Risk Template"
    >
      <div class="space-y-3">
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Select a template to pre-fill title, description, statement, and
          default values.
        </p>

        <div
          v-if="templatesLoading"
          class="py-8 text-center text-gray-500 dark:text-slate-400"
        >
          Loading templates...
        </div>

        <div v-else-if="templatesError" class="py-8 text-center text-red-500">
          Failed to load risk templates.
        </div>

        <div
          v-else-if="!riskTemplates?.length"
          class="py-8 text-center text-gray-500 dark:text-slate-400"
        >
          No risk templates available.
        </div>

        <div
          v-else
          class="max-h-[420px] overflow-auto rounded border border-ccf-300 dark:border-slate-700"
        >
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th class="text-left p-3 font-semibold">Title</th>
                <th class="text-left p-3 font-semibold">Statement</th>
                <th class="text-left p-3 font-semibold">Likelihood/Impact</th>
                <th class="text-left p-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(template, index) in riskTemplates"
                :key="
                  getRiskTemplateKey(template) ||
                  `risk-template-option-${index}`
                "
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
                <td class="p-3">
                  <button
                    type="button"
                    class="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    @click="applyTemplate(template)"
                  >
                    Apply
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ThreatIDSystem, type Risk, type ThreatID } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { isAxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import {
  buildRiskCollectionEndpoint,
  type RiskContext,
} from '@/utils/risk-context';
import Dialog from '@/volt/Dialog.vue';
import { getRiskTemplateKey, type RiskTemplate } from '@/types/risk-templates';

const props = defineProps<{
  poamId?: string;
  sspId?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [risk: Risk];
}>();

const toast = useToast();

const riskStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'remediating', label: 'Remediating' },
  { value: 'deviation-requested', label: 'Deviation Requested' },
  { value: 'deviation-approved', label: 'Deviation Approved' },
  { value: 'closed', label: 'Closed' },
];

const riskContext = computed<RiskContext | null>(() => {
  if (props.sspId) {
    return {
      scope: 'ssp',
      id: props.sspId,
      listRouteName: 'system-security-plan-risks',
      detailRouteName: 'system-security-plan-risk-detail',
    };
  }

  if (props.poamId) {
    return {
      scope: 'poam',
      id: props.poamId,
      listRouteName: 'risks:index',
      detailRouteName: 'risks:detail',
    };
  }

  return null;
});

const endpoint = computed(() => {
  if (!riskContext.value) return null;
  return buildRiskCollectionEndpoint(riskContext.value);
});

const {
  data: returnedRisk,
  isLoading: saving,
  execute: createRisk,
} = useDataApi<Risk>(
  endpoint,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const {
  data: riskTemplates,
  isLoading: templatesLoading,
  error: templatesError,
  execute: loadRiskTemplates,
} = useDataApi<RiskTemplate[]>(
  '/api/admin/risk-templates',
  {},
  { immediate: false, initialData: [] },
);

const formData = reactive({
  title: '',
  description: '',
  statement: '',
  status: '',
  threatIds: [] as ThreatID[],
  deadline: '',
  remarks: '',
});
const showTemplateSelector = ref(false);
const selectedTemplateName = ref('');
const templatesAccessDenied = ref(false);

function addThreatId() {
  formData.threatIds.push({
    id: '',
    system: ThreatIDSystem.OSCAL,
    href: '',
  });
}

function removeThreatId(index: number) {
  formData.threatIds.splice(index, 1);
}

function getTemplateMetadataString(
  value: unknown,
  fallbackPrefix: string,
): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0) {
    return `${fallbackPrefix}: ${value.join(', ')}`;
  }
  return null;
}

function getStatementFromTemplate(template: RiskTemplate): string {
  if (template.statement?.trim()) {
    return template.statement.trim();
  }
  return template.title;
}

function getThreatIdsFromTemplate(template: RiskTemplate): ThreatID[] {
  if (!Array.isArray(template.threatIds)) {
    return [];
  }

  return template.threatIds
    .filter((entry) => entry.id?.trim() && entry.system?.trim())
    .map((entry) => ({
      id: entry.id.trim(),
      system: entry.system.trim(),
    }));
}

function buildTemplateRemarks(template: RiskTemplate): string {
  const parts: string[] = [];

  if (template.likelihoodHint) {
    parts.push(`Likelihood hint: ${template.likelihoodHint}`);
  }
  if (template.impactHint) {
    parts.push(`Impact hint: ${template.impactHint}`);
  }

  const violationsLine = getTemplateMetadataString(
    template.violationIds,
    'Violation IDs',
  );
  if (violationsLine) {
    parts.push(violationsLine);
  }

  if (template.remediationTemplate?.title) {
    parts.push(`Remediation: ${template.remediationTemplate.title}`);
  }

  if (template.remediationTemplate?.tasks?.length) {
    parts.push(
      `Remediation tasks: ${template.remediationTemplate.tasks
        .map((task) => task.title)
        .join(', ')}`,
    );
  }

  return parts.join('\n');
}

function formatLikelihoodImpact(template: RiskTemplate): string {
  const likelihood = template.likelihoodHint ?? 'N/A';
  const impact = template.impactHint ?? 'N/A';
  return `${likelihood} / ${impact}`;
}

async function openTemplateSelector() {
  if (templatesAccessDenied.value) {
    return;
  }

  showTemplateSelector.value = true;
  try {
    await loadRiskTemplates('/api/admin/risk-templates');
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      templatesAccessDenied.value = true;
      showTemplateSelector.value = false;
      toast.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'You do not have access to risk templates.',
        life: 3000,
      });
      return;
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load templates.';
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: errorMessage,
      life: 3000,
    });
  }
}

function applyTemplate(template: RiskTemplate) {
  const statement = getStatementFromTemplate(template);

  formData.title = template.title;
  formData.description = statement;
  formData.statement = statement;

  const templateThreatIds = getThreatIdsFromTemplate(template);
  if (templateThreatIds.length > 0) {
    formData.threatIds = templateThreatIds;
  }

  const templateRemarks = buildTemplateRemarks(template);
  if (templateRemarks) {
    formData.remarks = templateRemarks;
  }

  selectedTemplateName.value = template.title;
  showTemplateSelector.value = false;
}

async function submit() {
  if (!endpoint.value) {
    toast.add({
      severity: 'error',
      summary: 'Missing context',
      detail: 'Risk creation context is not available.',
      life: 3000,
    });
    return;
  }

  if (!formData.title) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title is required',
      life: 3000,
    });
    return;
  }

  if (!formData.description) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required',
      life: 3000,
    });
    return;
  }

  if (!formData.statement) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Statement is required',
      life: 3000,
    });
    return;
  }

  if (!formData.status) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Status is required',
      life: 3000,
    });
    return;
  }

  try {
    let deadline: string | undefined;
    if (formData.deadline) {
      const parsedDeadline = new Date(formData.deadline);
      if (!Number.isNaN(parsedDeadline.getTime())) {
        deadline = parsedDeadline.toISOString();
      }
    }

    const normalizedThreatIds = formData.threatIds
      .map((threat) => {
        const id = threat.id.trim();
        const system = threat.system?.trim() || ThreatIDSystem.OSCAL;
        const href = threat.href?.trim();

        if (!id) return null;

        return href
          ? {
              id,
              system,
              href,
            }
          : {
              id,
              system,
            };
      })
      .filter((threat): threat is ThreatID => !!threat);

    const newRisk: Partial<Risk> = {
      uuid: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      statement: formData.statement,
      status: formData.status,
      threatIds:
        normalizedThreatIds.length > 0 ? normalizedThreatIds : undefined,
      deadline,
      remarks: formData.remarks || undefined,
    };

    await createRisk({
      data: newRisk,
    });

    toast.add({
      severity: 'success',
      summary: 'Risk Created',
      detail: 'Risk created successfully',
      life: 3000,
    });

    emit('created', returnedRisk.value!);
  } catch (error) {
    const errorMessage = isAxiosError(error)
      ? ((error.response?.data as ErrorResponse<ErrorBody> | undefined)?.errors
          ?.body ??
        error.message ??
        'Unknown error')
      : error instanceof Error
        ? error.message
        : 'Unknown error';

    toast.add({
      severity: 'error',
      summary: 'Creation Failed',
      detail: `Failed to create risk: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
