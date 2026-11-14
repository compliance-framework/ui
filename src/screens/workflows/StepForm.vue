<script setup lang="ts">
/**
 * Add or edit a workflow step, in the Steps tab's drawer: name, description, responsible role,
 * order, grace period, the evidence it requires and the steps it depends on. The script is the
 * classic form's; the fields are the design system's.
 */
import { ref, reactive, computed, watch } from 'vue';
import { useWorkflowStepDefinitions } from '@/composables/workflows';
import type {
  StepDefinition,
  StepDefinitionCreate,
  StepDefinitionUpdate,
  EvidenceRequirement,
  EvidenceType,
} from '@/types/workflows';
import {
  DEFAULT_STEP_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  parseEvidenceRequired,
  toGracePeriodInputValue,
} from '@/utils/workflows';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  workflowDefinitionId: string;
  availableSteps: StepDefinition[];
  step?: StepDefinition | null;
  defaultGracePeriodDays?: number;
}>();

const emit = defineEmits<{
  saved: [step: StepDefinition];
  cancel: [];
}>();

const { createStep, updateStep } = useWorkflowStepDefinitions();

type EvidenceItem = {
  type: EvidenceType;
  description: string;
  required: boolean;
};

type StepFormState = {
  workflowDefinitionId: string;
  name: string;
  description: string;
  responsibleRole: string;
  evidenceRequiredEnabled: boolean;
  evidenceItems: EvidenceItem[];
  gracePeriodDays: number;
  order: number;
  dependsOn: string[];
};

const defaultEvidenceItems: EvidenceItem[] = [
  { type: 'document', description: '', required: true },
];
// Step-level default comes from the parent workflow model when provided.
const effectiveDefaultGracePeriodDays =
  props.defaultGracePeriodDays ?? DEFAULT_STEP_GRACE_PERIOD_DAYS;

const form = reactive<StepFormState>({
  workflowDefinitionId: props.workflowDefinitionId,
  name: '',
  description: '',
  responsibleRole: '',
  evidenceRequiredEnabled: true,
  evidenceItems: [...defaultEvidenceItems],
  gracePeriodDays: effectiveDefaultGracePeriodDays,
  order: 1,
  dependsOn: [],
});

const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const gracePeriodDaysInput = ref(
  toGracePeriodInputValue(effectiveDefaultGracePeriodDays),
);

const evidenceTypeOptions: Array<{ label: string; value: EvidenceType }> = [
  { label: 'Document', value: 'document' },
  { label: 'Attestation', value: 'attestation' },
  { label: 'Screenshot', value: 'screenshot' },
  { label: 'Link', value: 'link' },
];

// Other steps that can be selected as dependencies (exclude current step)
const otherSteps = computed(() => {
  return props.availableSteps.filter((s) => s.id !== props.step?.id);
});

function initForm() {
  form.workflowDefinitionId = props.workflowDefinitionId;

  if (props.step) {
    const parsedEvidence = parseEvidenceRequired(props.step.evidenceRequired);

    form.name = props.step.name;
    form.description = props.step.description || '';
    form.responsibleRole = props.step.responsibleRole || '';
    form.evidenceRequiredEnabled = parsedEvidence.length > 0;
    form.evidenceItems =
      parsedEvidence.length > 0
        ? parsedEvidence.map((req) => ({
            type: req.type,
            description: req.description || '',
            required: req.required,
          }))
        : [...defaultEvidenceItems];
    form.gracePeriodDays =
      props.step.gracePeriodDays ?? effectiveDefaultGracePeriodDays;
    gracePeriodDaysInput.value =
      props.step.gracePeriodDays != null
        ? toGracePeriodInputValue(props.step.gracePeriodDays)
        : toGracePeriodInputValue(effectiveDefaultGracePeriodDays);
    form.order = props.step.order;
    form.dependsOn = props.step.dependsOn?.map((d) => d.dependsOnStepId) || [];
  } else {
    // Set default order to be after all existing steps
    form.name = '';
    form.description = '';
    form.responsibleRole = '';
    form.evidenceRequiredEnabled = true;
    form.evidenceItems = [...defaultEvidenceItems];
    form.gracePeriodDays = effectiveDefaultGracePeriodDays;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      effectiveDefaultGracePeriodDays,
    );
    form.order = props.availableSteps.length + 1;
    form.dependsOn = [];
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';
  const normalizedGracePeriodInput = String(gracePeriodDaysInput.value ?? '');
  if (!form.name?.trim()) {
    errors.name = 'Step name is required';
    return false;
  }

  if (normalizedGracePeriodInput.trim() === '') {
    // Empty input is treated as "use current upstream default" rather than
    // persisting a nullable value for steps.
    form.gracePeriodDays = effectiveDefaultGracePeriodDays;
  } else {
    const parsedGracePeriod = parseGracePeriodInput(normalizedGracePeriodInput);
    if (parsedGracePeriod.error) {
      errors.gracePeriodDays = parsedGracePeriod.error;
      return false;
    }
    form.gracePeriodDays = parsedGracePeriod.value;
  }

  // Check for circular dependencies
  if (form.dependsOn.length > 0 && props.step) {
    // Simple check: can't depend on yourself
    if (form.dependsOn.includes(props.step.id)) {
      errorMessage.value = 'A step cannot depend on itself';
      return false;
    }
  }

  return true;
}

function buildEvidencePayload(): EvidenceRequirement[] {
  return form.evidenceRequiredEnabled
    ? form.evidenceItems.map((item) => ({
        type: item.type,
        description: item.description,
        required: item.required,
      }))
    : [];
}

async function handleSubmit() {
  if (!validate()) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (props.step) {
      // Update existing step
      const updateData: StepDefinitionUpdate = {
        name: form.name,
        description: form.description || undefined,
        responsibleRole: form.responsibleRole || undefined,
        evidenceRequired: buildEvidencePayload(),
        gracePeriodDays: form.gracePeriodDays,
        order: form.order,
        dependsOn: form.dependsOn,
      };

      await updateStep(props.step.id, updateData, (step) => {
        emit('saved', step);
      });
    } else {
      // Create new step
      const createData: StepDefinitionCreate = {
        workflowDefinitionId: props.workflowDefinitionId,
        name: form.name,
        description: form.description || undefined,
        responsibleRole: form.responsibleRole || undefined,
        evidenceRequired: buildEvidencePayload(),
        gracePeriodDays: form.gracePeriodDays,
        order: form.order,
        dependsOn: form.dependsOn,
      };

      await createStep(createData, (step) => {
        emit('saved', step);
      });
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to save step';
  } finally {
    isSubmitting.value = false;
  }
}

// The design-system fields hold text; the form keeps numbers.
const orderInput = computed({
  get: () => String(form.order ?? ''),
  set: (value: string) => (form.order = Number(value) || 0),
});
const gracePeriodText = computed({
  get: () => String(gracePeriodDaysInput.value ?? ''),
  set: (value: string) => (gracePeriodDaysInput.value = value as never),
});
const dependencyOptions = computed(() =>
  otherSteps.value.map((s) => ({ value: s.id, label: s.name })),
);
/** Roles other steps use, offered as completions. */
const roleOptions = computed(() => [
  ...new Set(
    props.availableSteps
      .map((s) => s.responsibleRole?.trim())
      .filter((role): role is string => Boolean(role)),
  ),
]);
const newEvidenceItem = (): EvidenceItem => ({
  type: 'document',
  description: '',
  required: true,
});

// Initialize form when step prop changes
watch(() => props.step, initForm, { immediate: true });
</script>

<template>
  <form novalidate @submit.prevent="handleSubmit">
    <Stack gap="4">
      <FormField label="Name" required :error="errors.name">
        <TextInput v-model="form.name" />
      </FormField>
      <FormField label="Description">
        <Textarea v-model="form.description" :rows="3" />
      </FormField>
      <FormField
        label="Responsible role"
        hint="The role whose holder does this step, e.g. IAM Administrator."
      >
        <TextInput v-model="form.responsibleRole" :options="roleOptions" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Order">
          <TextInput v-model="orderInput" type="number" />
        </FormField>
        <FormField
          label="Grace period (days)"
          hint="Empty uses the workflow's default."
          :error="errors.gracePeriodDays"
        >
          <TextInput v-model="gracePeriodText" />
        </FormField>
      </Grid>
      <Checkbox
        v-model="form.evidenceRequiredEnabled"
        label="Evidence required"
      />
      <FieldList
        v-if="form.evidenceRequiredEnabled"
        v-model="form.evidenceItems"
        legend="Evidence requirements"
        item-label="requirement"
        add-label="Add requirement"
        empty-text="No requirements yet."
        :new-item="newEvidenceItem"
      >
        <template #item="{ item }">
          <Stack gap="2">
            <Grid min="sm" gap="2">
              <FormField label="Type">
                <Select v-model="item.type" :options="evidenceTypeOptions" />
              </FormField>
              <FormField label="Description">
                <TextInput v-model="item.description" />
              </FormField>
            </Grid>
            <Checkbox v-model="item.required" label="Required" />
          </Stack>
        </template>
      </FieldList>
      <CheckboxGroup
        v-if="dependencyOptions.length"
        v-model="form.dependsOn"
        legend="Depends on"
        hint="This step starts once these are done."
        :options="dependencyOptions"
      />
      <InlineMessage v-if="errorMessage" tone="error" title="Not saved">
        <p>{{ errorMessage }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="isSubmitting">{{
          step ? 'Save step' : 'Add step'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
