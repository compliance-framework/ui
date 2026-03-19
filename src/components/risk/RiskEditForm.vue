<template>
  <div class="p-6">
    <form @submit.prevent="submit" class="space-y-4">
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
            v-for="status in statusOptions"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>
      </div>

      <div
        class="rounded-md border border-ccf-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4"
      >
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Threats and remediations are managed from the dedicated tabs on the
          risk detail view.
        </p>
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
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted } from 'vue';
import type { Risk } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { buildRiskItemEndpoint, type RiskContext } from '@/utils/risk-context';
import { getRiskIdentifier } from '@/utils/risk-id';

const props = defineProps<{
  poamId?: string;
  sspId?: string;
  risk: Risk;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [risk: Risk];
}>();

const toast = useToast();

const riskStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigating-planned', label: 'Mitigating Planned' },
  { value: 'mitigating-implemented', label: 'Mitigating Implemented' },
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
      listRouteName: 'plan-of-action-and-milestones-risks',
      detailRouteName: 'plan-of-action-and-milestones-risk-detail',
    };
  }

  return null;
});

const riskId = computed(() => getRiskIdentifier(props.risk));

const endpoint = computed(() => {
  if (!riskContext.value || !riskId.value) return null;
  return buildRiskItemEndpoint(riskContext.value, riskId.value);
});

const { data: latestRisk, execute: fetchRisk } = useDataApi<Risk>(
  endpoint,
  {},
  { immediate: false },
);

const {
  data: returnedRisk,
  isLoading: saving,
  execute: updateRisk,
} = useDataApi<Risk>(
  endpoint,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const formData = reactive({
  title: '',
  description: '',
  statement: '',
  status: '',
  deadline: '',
  remarks: '',
});

const statusOptions = computed(() => {
  if (
    formData.status &&
    !riskStatusOptions.some((option) => option.value === formData.status)
  ) {
    return [
      { value: formData.status, label: formData.status },
      ...riskStatusOptions,
    ];
  }
  return riskStatusOptions;
});

function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

onMounted(() => {
  formData.title = props.risk.title || '';
  formData.description = props.risk.description;
  formData.statement = props.risk.statement || '';
  formData.status = props.risk.status;
  formData.deadline = toDateTimeLocal(props.risk.deadline);
  formData.remarks = props.risk.remarks || '';
});

async function submit() {
  if (!endpoint.value) {
    toast.add({
      severity: 'error',
      summary: 'Missing context',
      detail: 'Risk update context is not available.',
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

    await fetchRisk();

    const updatedRisk: Risk = {
      ...(latestRisk.value || props.risk),
      title: formData.title,
      description: formData.description,
      statement: formData.statement,
      status: formData.status,
      deadline,
      remarks: formData.remarks || undefined,
    };

    await updateRisk({
      data: updatedRisk,
    });

    toast.add({
      severity: 'success',
      summary: 'Risk Updated',
      detail: 'Risk updated successfully',
      life: 3000,
    });

    emit('saved', returnedRisk.value!);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: `Failed to update risk: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
