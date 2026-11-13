<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { isAxiosError } from 'axios';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import type { Risk } from '@/oscal';
import type { RiskTemplate } from '@/types/risk-templates';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import { getRiskIdentifier } from '@/utils/risk-id';
import {
  buildTemplateRemarks,
  getRemediationTemplateFromTemplate,
  getStatementFromTemplate,
  getThreatIdsFromTemplate,
  normalizeRiskLevel,
  toOptionalString,
} from '@/utils/risk-templates';
import { uuid } from '@/utils/uuid';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';

/**
 * New risk and Edit risk for a system, with the classic forms' fields and rules. A new risk can
 * start from a risk template, which fills in its text, likelihood and impact and attaches the
 * template's threats and remediation plan. Editing re-reads the risk first so fields this form
 * doesn't show are kept.
 */
const props = defineProps<{
  /** The system the risk belongs to; omit it and pass `systems` to let the user choose. */
  systemId?: string;
  systems?: { value: string; label: string }[];
  risk?: Risk;
}>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{
  /** The saved risk (the register create responds with one carrying an `id`), and its system. */
  saved: [risk: (Risk & { id?: string }) | undefined, systemId: string];
}>();

const api = useAuthenticatedInstance();
const chosenSystem = ref('');
const systemId = computed(() => props.systemId ?? chosenSystem.value);
const base = computed(
  () => `/api/oscal/system-security-plans/${systemId.value}/risks`,
);
const editing = computed(() => Boolean(props.risk));

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigating-planned', label: 'Mitigating planned' },
  { value: 'mitigating-implemented', label: 'Mitigating implemented' },
  { value: 'closed', label: 'Closed' },
];
const LEVEL_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: 'negligible', label: 'Negligible' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const form = reactive({
  title: '',
  description: '',
  statement: '',
  status: '',
  likelihood: '',
  impact: '',
  deadline: '',
  remarks: '',
});
const template = ref<RiskTemplate>();
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

/** A local date-time for the input, from an ISO instant. */
function toLocalInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

watch(open, (isOpen) => {
  if (!isOpen) return;
  const risk = props.risk;
  Object.assign(form, {
    title: risk?.title ?? '',
    description: risk?.description ?? '',
    statement: risk?.statement ?? '',
    status: risk?.status ?? '',
    likelihood: '',
    impact: '',
    deadline: toLocalInput(risk?.deadline),
    remarks: risk?.remarks ?? '',
  });
  template.value = undefined;
  chosenSystem.value = '';
  attempted.value = false;
  saveError.value = undefined;
});

const statusOptions = computed(() =>
  form.status && !STATUS_OPTIONS.some((o) => o.value === form.status)
    ? [{ value: form.status, label: form.status }, ...STATUS_OPTIONS]
    : [{ value: '', label: 'Choose a status' }, ...STATUS_OPTIONS],
);

const errors = computed(() => {
  if (!attempted.value) return {};
  const e: Record<string, string> = {};
  if (!form.title.trim()) e.title = 'Enter a title.';
  if (!form.description.trim()) e.description = 'Enter a description.';
  if (!form.statement.trim()) e.statement = 'Enter the risk statement.';
  if (!form.status) e.status = 'Choose a status.';
  if (!systemId.value) e.system = 'Choose the system this risk belongs to.';
  return e;
});

// Templates -----------------------------------------------------------------------------------

const templates = ref<RiskTemplate[]>();
const templatesDenied = ref(false);
const templateId = ref('');

async function loadTemplates(): Promise<void> {
  try {
    const response = await api.get<DataResponse<RiskTemplate[]>>(
      '/api/admin/risk-templates',
    );
    templates.value = response.data.data ?? [];
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403)
      templatesDenied.value = true;
    templates.value = [];
  }
}
const templateOptions = computed(() => [
  {
    value: '',
    label: templates.value ? 'Choose a template' : 'Loading templates…',
  },
  ...(templates.value ?? []).map((t, index) => ({
    value: String(index),
    label: `${t.title} (likelihood ${t.likelihoodHint ?? 'not set'}, impact ${t.impactHint ?? 'not set'})`,
  })),
]);
function applyTemplate(value: string): void {
  templateId.value = value;
  const chosen = templates.value?.[Number(value)];
  if (!value || !chosen) return;
  const statement = getStatementFromTemplate(chosen);
  Object.assign(form, {
    title: chosen.title,
    description: statement,
    statement,
    likelihood: normalizeRiskLevel(chosen.likelihoodHint),
    impact: normalizeRiskLevel(chosen.impactHint),
  });
  const remarks = buildTemplateRemarks(chosen);
  if (remarks) form.remarks = remarks;
  template.value = chosen;
}

// Save ----------------------------------------------------------------------------------------

function deadlineIso(): string | undefined {
  if (!form.deadline) return undefined;
  const date = new Date(form.deadline);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  let saved: Risk | undefined;
  try {
    if (props.risk) {
      const url = `${base.value}/${getRiskIdentifier(props.risk)}`;
      // Start from the latest copy, so fields this form doesn't show are kept.
      let latest: Risk = props.risk;
      try {
        latest =
          (await api.get<DataResponse<Risk>>(url)).data.data ?? props.risk;
      } catch {
        // Fall back to the copy the register loaded.
      }
      saved = (
        await api.put<DataResponse<Risk>>(
          url,
          {
            ...latest,
            title: form.title,
            description: form.description,
            statement: form.statement,
            status: form.status,
            deadline: deadlineIso(),
            remarks: form.remarks || undefined,
          },
          { transformRequest: [decamelizeKeys] },
        )
      ).data.data;
    } else {
      saved = (
        await api.post<DataResponse<Risk>>(
          base.value,
          {
            uuid: uuid(),
            title: form.title,
            description: form.description,
            statement: form.statement,
            status: form.status,
            likelihood: toOptionalString(form.likelihood),
            impact: toOptionalString(form.impact),
            threatIds: template.value
              ? getThreatIdsFromTemplate(template.value)
              : undefined,
            remediationTemplate: template.value
              ? getRemediationTemplateFromTemplate(template.value)
              : undefined,
            deadline: deadlineIso(),
            remarks: form.remarks || undefined,
          },
          { transformRequest: [decamelizeKeys] },
        )
      ).data.data;
    }
    open.value = false;
    emit('saved', saved, systemId.value);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      `The risk couldn't be ${editing.value ? 'saved' : 'created'}. Your entries are kept; try again.`,
    );
  } finally {
    saving.value = false;
  }
}

const dirty = computed(() =>
  Boolean(form.title || form.description || form.statement),
);
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="editing ? 'Edit risk' : 'New risk'"
    :description="
      editing
        ? risk?.title
        : 'Record something that could stop a control working.'
    "
    size="l"
    :dirty="dirty"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField
            v-if="systems && !props.systemId && !editing"
            label="System"
            required
            :error="errors.system"
          >
            <Select
              v-model="chosenSystem"
              :options="[{ value: '', label: 'Choose a system' }, ...systems]"
            />
          </FormField>
          <Stack v-if="!editing" gap="2">
            <Text v-if="templatesDenied" variant="caption"
              >Your access doesn't include risk templates.</Text
            >
            <template v-else>
              <Button
                v-if="!templates"
                size="sm"
                icon="add"
                @click="loadTemplates"
                >Start from a template</Button
              >
              <FormField
                v-else
                label="Template"
                hint="Fills in the text, likelihood and impact, and attaches the template's threats and remediation plan."
              >
                <Select
                  :model-value="templateId"
                  :options="templateOptions"
                  @update:model-value="applyTemplate"
                />
              </FormField>
            </template>
          </Stack>

          <FormField label="Title" required :error="errors.title">
            <TextInput v-model="form.title" />
          </FormField>
          <FormField label="Description" required :error="errors.description">
            <Textarea v-model="form.description" :rows="3" />
          </FormField>
          <FormField
            label="Statement"
            hint="What could happen, and why."
            required
            :error="errors.statement"
          >
            <Textarea v-model="form.statement" :rows="3" />
          </FormField>
          <Grid min="sm" gap="3">
            <FormField label="Status" required :error="errors.status">
              <Select v-model="form.status" :options="statusOptions" />
            </FormField>
            <FormField label="Deadline">
              <TextInput v-model="form.deadline" type="datetime-local" />
            </FormField>
          </Grid>
          <Grid v-if="!editing" min="sm" gap="3">
            <FormField label="Likelihood">
              <Select v-model="form.likelihood" :options="LEVEL_OPTIONS" />
            </FormField>
            <FormField label="Impact">
              <Select v-model="form.impact" :options="LEVEL_OPTIONS" />
            </FormField>
          </Grid>
          <FormField label="Remarks">
            <Textarea v-model="form.remarks" :rows="2" />
          </FormField>
          <InlineMessage v-if="saveError" tone="error" title="Not saved">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving">{{
              editing ? 'Save risk' : 'Create risk'
            }}</Button>
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
