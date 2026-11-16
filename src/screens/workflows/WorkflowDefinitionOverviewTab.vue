<script setup lang="ts">
/**
 * A workflow definition's Overview tab: its details as an edit form (name, description, version,
 * suggested cadence, grace period, required evidence) and its metadata. The script is the classic
 * page's; the template and the helpers at the end are new.
 */
import { ref, reactive, computed, watch } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useToast } from '@/ds/toasts';
import type { WorkflowDefinitionUpdate, EvidenceType } from '@/types/workflows';
import type { CadenceType } from '@/types/workflows';
import { formatDateTime } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  toGracePeriodInputValue,
  stringifyEvidenceRequired,
  parseEvidenceRequired,
} from '@/utils/workflows';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();

const store = useWorkflowDefinitionStore();
const toast = useToast();

const form = reactive<WorkflowDefinitionUpdate>({
  name: '',
  description: '',
  version: '',
  status: 'draft',
  suggestedCadence: undefined,
  evidenceRequired: stringifyEvidenceRequired([]),
});

const originalForm = ref<WorkflowDefinitionUpdate>({});
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const selectedEvidenceTypes = ref<EvidenceType[]>([]);
const gracePeriodDaysInput = ref(
  toGracePeriodInputValue(DEFAULT_GRACE_PERIOD_DAYS),
);

const cadenceOptions: Array<{ label: string; value: string }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
  { label: 'On Demand', value: 'on_demand' },
];

const evidenceOptions: Array<{ label: string; value: EvidenceType }> = [
  { label: 'Document', value: 'document' },
  { label: 'Text', value: 'text' },
  { label: 'Screenshot', value: 'screenshot' },
  { label: 'Automatic Evidence', value: 'automatic' },
];

const hasChanges = computed(() => {
  return JSON.stringify(form) !== JSON.stringify(originalForm.value);
});

function initForm() {
  if (store.definition) {
    form.name = store.definition.name;
    form.description = store.definition.description || '';
    form.version = store.definition.version || '1.0.0';
    form.status = store.definition.status;
    form.suggestedCadence = store.definition.suggestedCadence;
    form.evidenceRequired = store.definition.evidenceRequired;
    // Definitions are always persisted with a concrete grace period value.
    // If the backend record has no explicit value yet, fall back to the
    // platform default so unrelated edits don't leave this undefined.
    form.gracePeriodDays =
      store.definition.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      store.definition.gracePeriodDays,
    );
    selectedEvidenceTypes.value = parseEvidenceRequired(
      store.definition.evidenceRequired,
    ).map((req) => req.type);
    // Normalise as the evidence watcher will, so an untouched form doesn't count as changed.
    form.evidenceRequired = stringifyEvidenceRequired(
      selectedEvidenceTypes.value,
    );

    originalForm.value = { ...form };
  }
}

function resetForm() {
  initForm();
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.name?.trim()) {
    errors.name = 'Name is required';
    return false;
  }

  const parsedGracePeriod = parseGracePeriodInput(gracePeriodDaysInput.value);
  if (parsedGracePeriod.error) {
    errors.gracePeriodDays = parsedGracePeriod.error;
    return false;
  }
  form.gracePeriodDays = parsedGracePeriod.value;

  return true;
}

async function handleSubmit() {
  if (!validate()) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await store.updateDefinition(form);
    toast.add({
      severity: 'success',
      summary: 'Definition Updated',
      detail: 'Workflow definition has been updated successfully',
      life: 3000,
    });
    originalForm.value = { ...form };
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to update definition';
    toast.add({
      severity: 'error',
      summary: 'Error Updating Definition',
      detail: errorMessage.value,
      life: 3000,
    });
  } finally {
    isSubmitting.value = false;
  }
}

watch(
  selectedEvidenceTypes,
  (values) => {
    form.evidenceRequired = stringifyEvidenceRequired(values);
  },
  { deep: true },
);

watch(gracePeriodDaysInput, (value) => {
  // Keep hasChanges reactive for grace-period-only edits by mirroring valid
  // input into the form model before submit-time validation runs.
  const parsedGracePeriod = parseGracePeriodInput(value);
  if (!parsedGracePeriod.error) {
    form.gracePeriodDays = parsedGracePeriod.value;
  }
});

// Initialize form when definition loads
watch(
  () => store.definition,
  () => {
    initForm();
  },
  { immediate: true },
);

// Design-system view ---------------------------------------------------------------------------

/** Select binds a string; the form keeps `undefined` for "no suggestion". */
const cadence = computed({
  get: () => form.suggestedCadence ?? '',
  set: (value: string) => {
    form.suggestedCadence = (value || undefined) as CadenceType | undefined;
  },
});
const cadenceSelectOptions = [
  { value: '', label: 'No suggestion' },
  ...cadenceOptions.map((o) => ({ value: o.value, label: o.label })),
];
const evidence = computed({
  get: () => selectedEvidenceTypes.value as string[],
  set: (values: string[]) => {
    selectedEvidenceTypes.value = values as EvidenceType[];
  },
});
const saveDenied = computed(() => {
  if (!can(RESOURCES.WORKFLOW_DEFINITION, ACTIONS.UPDATE))
    return "Your access doesn't include changing workflow definitions.";
  return hasChanges.value ? undefined : 'Nothing has changed yet.';
});
const metadata = computed(() => {
  const d = store.definition;
  if (!d) return [];
  return [
    {
      key: 'created',
      label: 'Created',
      value: d.createdAt ? formatDateTime(d.createdAt) : '',
    },
    {
      key: 'updated',
      label: 'Last updated',
      value: d.updatedAt ? formatDateTime(d.updatedAt) : '',
    },
    { key: 'steps', label: 'Steps', value: store.steps.length },
    { key: 'id', label: 'ID', value: d.id },
  ];
});
</script>

<template>
  <Stack v-if="store.definition" gap="5">
    <Panel title="Details" :level="2">
      <form novalidate @submit.prevent="handleSubmit">
        <Stack gap="4">
          <FormField label="Name" required :error="errors.name">
            <TextInput v-model="form.name" />
          </FormField>
          <FormField label="Description">
            <Textarea
              v-model="form.description"
              :rows="3"
              placeholder="What this workflow is for"
            />
          </FormField>
          <FormField label="Version">
            <TextInput v-model="form.version" placeholder="1.0.0" />
          </FormField>
          <FormField
            label="Suggested cadence"
            hint="New instances start with this; each instance can change it."
          >
            <Select v-model="cadence" :options="cadenceSelectOptions" />
          </FormField>
          <FormField
            label="Grace period (days)"
            hint="How long tasks may run past their due date before they count as overdue."
            :error="errors.gracePeriodDays"
          >
            <TextInput v-model="gracePeriodDaysInput" placeholder="7" />
          </FormField>
          <CheckboxGroup
            v-model="evidence"
            legend="Evidence required"
            hint="Steps in this workflow require these kinds of evidence."
            :options="
              evidenceOptions.map((o) => ({ value: o.value, label: o.label }))
            "
          />
          <InlineMessage v-if="errorMessage" tone="error" title="Not saved">
            <p>{{ errorMessage }}</p>
          </InlineMessage>
          <Cluster gap="2">
            <Button
              variant="primary"
              type="submit"
              :loading="isSubmitting"
              :disabled-reason="saveDenied"
              >Save changes</Button
            >
            <Button
              :disabled-reason="hasChanges ? undefined : 'Nothing to reset.'"
              @click="resetForm"
              >Reset</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Panel>
    <Panel title="Metadata" :level="2">
      <DescriptionList :items="metadata" />
    </Panel>
  </Stack>
</template>
