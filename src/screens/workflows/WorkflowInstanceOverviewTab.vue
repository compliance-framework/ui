<script setup lang="ts">
/**
 * A workflow instance's Overview tab: its details as an edit form (name, description, cadence or
 * cron, grace period), its definition, and its metadata. The script is the classic page's; the
 * template and the helpers at the end are new.
 */
import { ref, reactive, computed, watch } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useToast } from '@/ds/toasts';
import type { WorkflowInstanceUpdate, CadenceType } from '@/types/workflows';
import { formatDateTime } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { validateCronExpression } from '@/utils/cron';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  toGracePeriodInputValue,
} from '@/utils/workflows';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();

const store = useWorkflowInstanceStore();
const toast = useToast();

const form = reactive<WorkflowInstanceUpdate>({
  name: '',
  description: '',
  cadence: 'monthly',
});

const originalForm = ref<WorkflowInstanceUpdate>({});
const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const gracePeriodDaysInput = ref(
  toGracePeriodInputValue(DEFAULT_GRACE_PERIOD_DAYS),
);

const selectedCadence = ref<string>('monthly');
const cronExpression = ref('');

const cadenceOptions: Array<{ label: string; value: string }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
  { label: 'On Demand', value: 'on_demand' },
  { label: 'Custom (Cron)', value: 'custom' },
];

watch(selectedCadence, (val) => {
  if (val === 'custom') {
    form.cadence = cronExpression.value
      ? `cron:${cronExpression.value}`
      : form.cadence;
  } else {
    form.cadence = val as CadenceType;
  }
});

watch(cronExpression, (val) => {
  if (selectedCadence.value === 'custom' && val) {
    form.cadence = `cron:${val}`;
  }
});

const hasChanges = computed(() => {
  return JSON.stringify(form) !== JSON.stringify(originalForm.value);
});

function initForm() {
  if (store.instance) {
    form.name = store.instance.name;
    form.description = store.instance.description || '';
    form.cadence = store.instance.cadence;
    // Default precedence for instance editing:
    // 1) explicit instance override, 2) workflow definition default,
    // 3) global platform fallback.
    const defaultGracePeriodDays =
      store.instance.workflowDefinition?.gracePeriodDays ??
      DEFAULT_GRACE_PERIOD_DAYS;
    form.gracePeriodDays =
      store.instance.gracePeriodDays ?? defaultGracePeriodDays;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      store.instance.gracePeriodDays ?? defaultGracePeriodDays,
    );

    // Handle custom cron cadence
    if (store.instance.cadence.startsWith('cron:')) {
      selectedCadence.value = 'custom';
      cronExpression.value = store.instance.cadence.slice(5);
    } else {
      selectedCadence.value = store.instance.cadence;
      cronExpression.value = '';
    }

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

  if (selectedCadence.value === 'custom') {
    if (!cronExpression.value.trim()) {
      errors.cronExpression = 'Cron expression is required';
      return false;
    }
    const cronError = validateCronExpression(cronExpression.value.trim());
    if (cronError) {
      errors.cronExpression = cronError;
      return false;
    }
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
    await store.updateInstance(form);
    toast.add({
      severity: 'success',
      summary: 'Instance Updated',
      detail: 'Workflow instance has been updated successfully',
      life: 3000,
    });
    originalForm.value = { ...form };
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to update instance';
    toast.add({
      severity: 'error',
      summary: 'Error Updating Instance',
      detail: errorMessage.value,
      life: 3000,
    });
  } finally {
    isSubmitting.value = false;
  }
}

watch(gracePeriodDaysInput, (value) => {
  // Keep hasChanges reactive for grace-period-only edits by mirroring valid
  // input into the form model before submit-time validation runs.
  const parsedGracePeriod = parseGracePeriodInput(value);
  if (!parsedGracePeriod.error) {
    form.gracePeriodDays = parsedGracePeriod.value;
  }
});

// Initialize form when instance loads
watch(
  () => store.instance,
  () => {
    initForm();
  },
  { immediate: true },
);

// Design-system view ---------------------------------------------------------------------------

const saveDenied = computed(() => {
  if (!can(RESOURCES.WORKFLOW_INSTANCE, ACTIONS.UPDATE))
    return "Your access doesn't include changing workflow instances.";
  return hasChanges.value ? undefined : 'Nothing has changed yet.';
});
const metadata = computed(() => {
  const i = store.instance;
  if (!i) return [];
  const date = (value?: string) => (value ? formatDateTime(value) : '');
  return [
    {
      key: 'status',
      label: 'Status',
      value: store.isActive ? 'Active' : 'Inactive',
    },
    {
      key: 'last',
      label: 'Last run',
      value: date(i.lastExecutionAt) || 'Never',
    },
    { key: 'runs', label: 'Runs', value: store.executions.length },
    { key: 'created', label: 'Created', value: date(i.createdAt) },
    { key: 'updated', label: 'Last updated', value: date(i.updatedAt) },
    ...(i.systemId
      ? [{ key: 'system', label: 'System ID', value: i.systemId }]
      : []),
    ...(i.controlId
      ? [{ key: 'control', label: 'Control ID', value: i.controlId }]
      : []),
    { key: 'id', label: 'ID', value: i.id },
  ];
});
</script>

<template>
  <Stack v-if="store.instance" gap="5">
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
              placeholder="What this instance is for"
            />
          </FormField>
          <FormField label="How often it runs" required>
            <Select
              v-model="selectedCadence"
              :options="
                cadenceOptions.map((o) => ({ value: o.value, label: o.label }))
              "
            />
          </FormField>
          <FormField
            v-if="selectedCadence === 'custom'"
            label="Cron expression (6 fields)"
            hint="Seconds, minutes, hours, day of month, month, day of week."
            required
            :error="errors.cronExpression"
          >
            <TextInput v-model="cronExpression" placeholder="0 0 9 * * 1" />
          </FormField>
          <FormField
            label="Grace period (days)"
            hint="How long tasks may run past their due date before they count as overdue."
            :error="errors.gracePeriodDays"
          >
            <TextInput v-model="gracePeriodDaysInput" placeholder="7" />
          </FormField>
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
    <Panel
      title="Workflow definition"
      :description="store.instance.workflowDefinition?.description"
      :level="2"
    >
      <TextLink
        :to="{
          name: 'workflow-definition-editor',
          params: { id: store.instance.workflowDefinitionId },
        }"
        >{{
          store.instance.workflowDefinition?.name ??
          store.instance.workflowDefinitionId
        }}</TextLink
      >
    </Panel>
    <Panel title="Metadata" :level="2">
      <DescriptionList :items="metadata" />
    </Panel>
  </Stack>
</template>
