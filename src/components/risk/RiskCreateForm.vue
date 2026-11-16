<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="4">
      <Cluster justify="between" gap="2">
        <Text variant="secondary">{{
          selectedTemplateName
            ? `Using template: ${selectedTemplateName}`
            : 'Optionally pre-fill this form from a reusable risk template.'
        }}</Text>
        <Button
          :disabled-reason="
            templatesAccessDenied
              ? 'You do not have permission to use risk templates.'
              : undefined
          "
          @click="openTemplateSelector"
          >Use Template</Button
        >
      </Cluster>
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
          :options="riskStatusOptions"
          placeholder="Select status"
        />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Likelihood">
          <Select
            v-model="formData.likelihood"
            :options="riskLevelOptions"
            placeholder="Not set"
          />
        </FormField>
        <FormField label="Impact">
          <Select
            v-model="formData.impact"
            :options="riskLevelOptions"
            placeholder="Not set"
          />
        </FormField>
      </Grid>
      <Text variant="caption"
        >Threats and remediations can be added after the risk is created, from
        the tabs on the risk page.</Text
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
          >Create</Button
        >
      </Cluster>
    </Stack>

    <Dialog
      v-model:open="showTemplateSelector"
      title="Select risk template"
      description="Pre-fills title, description, statement and default values."
      size="l"
    >
      <DataState
        :status="
          templatesLoading
            ? 'loading'
            : templatesError
              ? 'error'
              : riskTemplates?.length
                ? 'ready'
                : 'empty'
        "
        subject="risk templates"
        empty-title="No risk templates"
        empty-body="Create risk templates under Admin to reuse them here."
        icon="templates"
        @retry="openTemplateSelector"
      >
        <DataTable
          caption="Risk templates"
          caption-hidden
          :columns="[
            { key: 'title', label: 'Title', minWidth: 'sm' },
            { key: 'statement', label: 'Statement' },
            { key: 'levels', label: 'Likelihood / impact', nowrap: true },
          ]"
          :rows="
            (riskTemplates ?? []).map((template, index) => ({
              id: getRiskTemplateKey(template) || `template-${index}`,
              title: template.title,
              statement: template.statement || 'Not set',
              levels: formatLikelihoodImpact(template),
              template,
            }))
          "
          :row-key="(r) => r.id"
        >
          <template #actions="{ row: r }">
            <Button size="sm" @click="applyTemplate(r.template)">Apply</Button>
          </template>
        </DataTable>
      </DataState>
    </Dialog>
  </form>
</template>

<script setup lang="ts">
import {
  buildTemplateRemarks,
  formatLikelihoodImpact,
  getRemediationTemplateFromTemplate,
  getStatementFromTemplate,
  getThreatIdsFromTemplate,
  normalizeRiskLevel,
  toOptionalString,
} from '@/utils/risk-templates';
import { computed, reactive, ref } from 'vue';
import { uuid } from '@/utils/uuid';
import { type Risk } from '@/oscal';
import { useToast } from '@/ds/toasts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { isAxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import {
  buildRiskCollectionEndpoint,
  type RiskContext,
} from '@/utils/risk-context';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { getRiskTemplateKey, type RiskTemplate } from '@/types/risk-templates';

const props = defineProps<{
  poamId?: string;
  sspId?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  // The SSP-scoped register create responds with a register risk carrying an
  // `id`; the plain OSCAL create does not, hence the optional field.
  created: [risk: Risk & { id?: string }];
}>();

const toast = useToast();

const riskStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigating-planned', label: 'Mitigating Planned' },
  { value: 'mitigating-implemented', label: 'Mitigating Implemented' },
  { value: 'closed', label: 'Closed' },
];

const riskLevelOptions = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
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
  likelihood: '',
  impact: '',
  deadline: '',
  remarks: '',
});

const showTemplateSelector = ref(false);
const selectedTemplate = ref<RiskTemplate | null>(null);
const selectedTemplateName = ref('');
const templatesAccessDenied = ref(false);

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
  formData.likelihood = normalizeRiskLevel(template.likelihoodHint);
  formData.impact = normalizeRiskLevel(template.impactHint);
  selectedTemplate.value = template;

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

    const newRisk: Partial<Risk> & {
      likelihood?: string;
      impact?: string;
      threatIds?: Array<{
        system: string;
        id: string;
        title: string;
        url?: string;
      }>;
      remediationTemplate?: {
        title: string;
        description?: string;
        tasks?: Array<{ title: string; orderIndex: number }>;
      };
    } = {
      uuid: uuid(),
      title: formData.title,
      description: formData.description,
      statement: formData.statement,
      status: formData.status,
      likelihood: toOptionalString(formData.likelihood),
      impact: toOptionalString(formData.impact),
      threatIds: selectedTemplate.value
        ? getThreatIdsFromTemplate(selectedTemplate.value)
        : undefined,
      remediationTemplate: selectedTemplate.value
        ? getRemediationTemplateFromTemplate(selectedTemplate.value)
        : undefined,
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
