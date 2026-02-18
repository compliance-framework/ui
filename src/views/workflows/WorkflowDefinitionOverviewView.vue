<template>
  <div v-if="store.definition" class="space-y-6">
    <!-- Edit Form -->
    <form @submit.prevent="handleSubmit" class="max-w-2xl">
      <div class="space-y-6">
        <!-- Name -->
        <div>
          <Label for="name" required>Name</Label>
          <InputText
            id="name"
            v-model="form.name"
            placeholder="Enter workflow name"
            class="w-full"
            :invalid="!!errors.name"
          />
          <small v-if="errors.name" class="text-red-500">{{
            errors.name
          }}</small>
        </div>

        <!-- Description -->
        <div>
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Describe what this workflow does..."
            rows="3"
            class="w-full"
          />
        </div>

        <!-- Version -->
        <div>
          <Label for="version">Version</Label>
          <InputText
            id="version"
            v-model="form.version"
            placeholder="1.0.0"
            class="w-full"
          />
        </div>

        <!-- Suggested Cadence -->
        <div>
          <Label for="cadence">Suggested Cadence</Label>
          <Select
            id="cadence"
            v-model="form.suggestedCadence"
            :options="cadenceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select cadence"
            class="w-full"
            showClear
          />
        </div>

        <!-- Grace Period -->
        <div>
          <Label for="gracePeriodDays">Grace Period (Days)</Label>
          <InputText
            id="gracePeriodDays"
            v-model="gracePeriodDaysInput"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 7"
            class="w-full"
            :invalid="!!errors.gracePeriodDays"
          />
          <small v-if="errors.gracePeriodDays" class="text-red-500">
            {{ errors.gracePeriodDays }}
          </small>
        </div>

        <!-- Evidence Required Types -->
        <div>
          <Label for="definition-evidence-required"
            >Required Evidence Types</Label
          >
          <MultiSelect
            id="definition-evidence-required"
            v-model="selectedEvidenceTypes"
            :options="evidenceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select evidence types"
            class="w-full"
          />
          <small class="text-gray-500 dark:text-slate-400">
            Selected types will be required for steps in this workflow
            definition
          </small>
        </div>
      </div>

      <!-- Error Message -->
      <Message v-if="errorMessage" severity="error" class="mt-6">
        {{ errorMessage }}
      </Message>

      <!-- Actions -->
      <div class="flex gap-3 mt-6">
        <PrimaryButton type="submit" :disabled="isSubmitting || !hasChanges">
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          Save Changes
        </PrimaryButton>
        <SecondaryButton
          type="button"
          @click="resetForm"
          :disabled="!hasChanges"
        >
          Reset
        </SecondaryButton>
      </div>
    </form>

    <!-- Metadata -->
    <div class="border-t border-gray-200 dark:border-slate-700 pt-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
        Metadata
      </h3>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-gray-500 dark:text-slate-400">ID</dt>
          <dd class="font-mono text-gray-900 dark:text-slate-200">
            {{ store.definition.id }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Created</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ formatDate(store.definition.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Last Updated</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ formatDate(store.definition.updatedAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Step Count</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ store.steps.length }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useToast } from 'primevue/usetoast';
import type { WorkflowDefinitionUpdate, EvidenceType } from '@/types/workflows';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  toGracePeriodInputValue,
  stringifyEvidenceRequired,
  parseEvidenceRequired,
} from '@/utils/workflows';

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
    form.gracePeriodDays =
      store.definition.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
    gracePeriodDaysInput.value = toGracePeriodInputValue(
      store.definition.gracePeriodDays,
    );
    selectedEvidenceTypes.value = parseEvidenceRequired(
      store.definition.evidenceRequired,
    ).map((req) => req.type);

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

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

watch(
  selectedEvidenceTypes,
  (values) => {
    form.evidenceRequired = stringifyEvidenceRequired(values);
  },
  { deep: true },
);

watch(gracePeriodDaysInput, (value) => {
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
</script>
