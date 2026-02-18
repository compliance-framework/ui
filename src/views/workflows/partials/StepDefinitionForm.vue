<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Name -->
    <div>
      <Label for="step-name" required>Step Name</Label>
      <InputText
        id="step-name"
        v-model="form.name"
        placeholder="Enter step name"
        class="w-full"
        :invalid="!!errors.name"
      />
      <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
    </div>

    <!-- Description -->
    <div>
      <Label for="step-description">Description</Label>
      <Textarea
        id="step-description"
        v-model="form.description"
        placeholder="Describe what this step involves..."
        rows="3"
        class="w-full"
      />
    </div>

    <!-- Responsible Role -->
    <div>
      <Label for="step-role">Responsible Role</Label>
      <InputText
        id="step-role"
        v-model="form.responsibleRole"
        placeholder="e.g., Security Officer, System Admin"
        class="w-full"
      />
      <small class="text-gray-500 dark:text-slate-400">
        The role responsible for completing this step
      </small>
    </div>

    <!-- Order -->
    <div>
      <Label for="step-order">Display Order</Label>
      <input
        id="step-order"
        v-model.number="form.order"
        type="number"
        min="1"
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <small class="text-gray-500 dark:text-slate-400">
        Order in which this step appears in the list
      </small>
    </div>

    <!-- Estimated Duration -->
    <div>
      <Label for="step-duration">Estimated Duration (minutes)</Label>
      <input
        id="step-duration"
        v-model.number="form.estimatedDurationMinutes"
        type="number"
        min="0"
        placeholder="30"
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <!-- Grace Period -->
    <div>
      <Label for="step-grace-period">Grace Period (Days)</Label>
      <input
        id="step-grace-period"
        v-model="gracePeriodDaysInput"
        type="number"
        min="0"
        placeholder="7"
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500': !!errors.gracePeriodDays }"
      />
      <small class="text-gray-500 dark:text-slate-400">
        Number of days after due date before this step is marked as overdue
      </small>
      <small v-if="errors.gracePeriodDays" class="text-red-500 block">
        {{ errors.gracePeriodDays }}
      </small>
    </div>

    <!-- Evidence Required -->
    <div class="flex items-center gap-3">
      <input
        id="step-evidence"
        type="checkbox"
        v-model="form.evidenceRequiredEnabled"
        class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <Label for="step-evidence" class="mb-0">Evidence Required</Label>
    </div>

    <!-- Evidence Types (if evidence required) -->
    <div v-if="form.evidenceRequiredEnabled" class="space-y-3">
      <div class="flex items-center justify-between">
        <Label>Evidence Requirements</Label>
        <SecondaryButton
          type="button"
          size="small"
          @click="
            form.evidenceItems.push({
              type: 'document',
              description: '',
              required: true,
            })
          "
        >
          <i class="pi pi-plus mr-1"></i>
          Add Evidence
        </SecondaryButton>
      </div>

      <div
        v-for="(item, index) in form.evidenceItems"
        :key="index"
        class="p-3 border border-gray-200 dark:border-slate-600 rounded-lg space-y-3"
      >
        <div class="flex items-center gap-2">
          <Select
            v-model="item.type"
            :options="evidenceTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select type"
            class="w-40"
          />
          <div class="flex items-center gap-2 ml-auto">
            <input
              :id="'required-' + index"
              v-model="item.required"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label :for="'required-' + index" class="mb-0 text-sm"
              >Required</Label
            >
          </div>
          <SecondaryButton
            v-if="form.evidenceItems.length > 1"
            type="button"
            size="small"
            severity="danger"
            @click="form.evidenceItems.splice(index, 1)"
          >
            <i class="pi pi-trash mr-1"></i>
            Remove
          </SecondaryButton>
        </div>
        <InputText
          v-model="item.description"
          placeholder="Description (e.g., 'Security assessment report')"
          class="w-full"
        />
      </div>
    </div>

    <!-- Dependencies -->
    <div v-if="otherSteps.length > 0">
      <Label for="step-dependencies">Dependencies</Label>
      <MultiSelect
        id="step-dependencies"
        v-model="form.dependsOn"
        :options="otherSteps"
        optionLabel="name"
        optionValue="id"
        placeholder="Select steps that must complete first"
        class="w-full"
      />
      <small class="text-gray-500 dark:text-slate-400">
        This step will be blocked until all dependencies are completed
      </small>
    </div>

    <!-- Error Message -->
    <Message v-if="errorMessage" severity="error">
      {{ errorMessage }}
    </Message>

    <!-- Actions -->
    <div
      class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="isSubmitting">
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        {{ props.step ? 'Update Step' : 'Create Step' }}
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
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
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  parseEvidenceRequired,
  toGracePeriodInputValue,
} from '@/utils/workflows';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

const props = defineProps<{
  workflowDefinitionId: string;
  availableSteps: StepDefinition[];
  step?: StepDefinition | null;
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
  estimatedDurationMinutes: number;
  gracePeriodDays: number;
  order: number;
  dependsOn: string[];
};

const defaultEvidenceItems: EvidenceItem[] = [
  { type: 'document', description: '', required: true },
];

const form = reactive<StepFormState>({
  workflowDefinitionId: props.workflowDefinitionId,
  name: '',
  description: '',
  responsibleRole: '',
  evidenceRequiredEnabled: true,
  evidenceItems: [...defaultEvidenceItems],
  estimatedDurationMinutes: 30,
  gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
  order: 1,
  dependsOn: [],
});

const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const gracePeriodDaysInput = ref(
  toGracePeriodInputValue(DEFAULT_GRACE_PERIOD_DAYS),
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
    form.estimatedDurationMinutes = props.step.estimatedDurationMinutes || 30;
    form.gracePeriodDays =
      props.step.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      props.step.gracePeriodDays,
    );
    form.order = props.step.order;
    form.dependsOn = props.step.dependsOn?.map((d) => d.dependsOnStepId) || [];
  } else {
    // Set default order to be after all existing steps
    form.name = '';
    form.description = '';
    form.responsibleRole = '';
    form.evidenceRequiredEnabled = true;
    form.evidenceItems = [...defaultEvidenceItems];
    form.estimatedDurationMinutes = 30;
    form.gracePeriodDays = DEFAULT_GRACE_PERIOD_DAYS;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      DEFAULT_GRACE_PERIOD_DAYS,
    );
    form.order = props.availableSteps.length + 1;
    form.dependsOn = [];
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.name?.trim()) {
    errors.name = 'Step name is required';
    return false;
  }

  const parsedGracePeriod = parseGracePeriodInput(gracePeriodDaysInput.value);
  if (parsedGracePeriod.error) {
    errors.gracePeriodDays = parsedGracePeriod.error;
    return false;
  }
  form.gracePeriodDays = parsedGracePeriod.value;

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
        estimatedDurationMinutes: form.estimatedDurationMinutes || undefined,
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
        estimatedDurationMinutes: form.estimatedDurationMinutes || undefined,
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

// Initialize form when step prop changes
watch(() => props.step, initForm, { immediate: true });
</script>
