<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="4">
      <FormField label="Title" required>
        <TextInput v-model="formData.title" placeholder="Enter risk title" />
      </FormField>
      <FormField label="Description" required>
        <Textarea
          v-model="formData.description"
          :rows="4"
          placeholder="Enter risk description"
        />
      </FormField>
      <FormField label="Statement" required>
        <Textarea
          v-model="formData.statement"
          :rows="3"
          placeholder="Enter risk statement"
        />
      </FormField>
      <FormField label="Status" required>
        <Select
          v-model="formData.status"
          :options="statusOptions"
          placeholder="Select status"
        />
      </FormField>
      <Text variant="caption"
        >Threats and remediations are managed from the tabs on the risk
        page.</Text
      >
      <FormField label="Deadline">
        <TextInput v-model="formData.deadline" type="datetime-local" />
      </FormField>
      <FormField label="Remarks">
        <Textarea
          v-model="formData.remarks"
          :rows="3"
          placeholder="Enter additional remarks (optional)"
        />
      </FormField>
      <Cluster justify="end" gap="2">
        <Button @click="$emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="saving"
          :disabled-reason="
            !formData.title ||
            !formData.description ||
            !formData.statement ||
            !formData.status
              ? 'Fill in title, description, statement and status.'
              : undefined
          "
          >Save</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
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

    let riskSnapshot: Risk = props.risk;
    try {
      await fetchRisk();
      riskSnapshot = latestRisk.value || props.risk;
    } catch {
      toast.add({
        severity: 'warn',
        summary: 'Refresh Failed',
        detail:
          'Latest risk details could not be reloaded. Saving with the current form data instead.',
        life: 3000,
      });
    }

    const updatedRisk: Risk = {
      ...riskSnapshot,
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
