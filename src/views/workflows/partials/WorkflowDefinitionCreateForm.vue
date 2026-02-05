<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
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
      <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
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
      <small class="text-gray-500 dark:text-slate-400">
        Semantic versioning recommended (e.g., 1.0.0)
      </small>
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
      <small class="text-gray-500 dark:text-slate-400">
        How often should this workflow typically be executed?
      </small>
    </div>

    <!-- Evidence Required Types -->
    <div>
      <Label for="definition-create-evidence">Required Evidence Types</Label>
      <MultiSelect
        id="definition-create-evidence"
        v-model="selectedEvidenceTypes"
        :options="evidenceOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select evidence types"
        class="w-full"
      />
      <small class="text-gray-500 dark:text-slate-400">
        Selected types will be required for steps in this workflow definition
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
        Create Definition
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useWorkflowDefinitions } from '@/composables/workflows';
import type {
  WorkflowDefinition,
  WorkflowDefinitionCreate,
  EvidenceType,
} from '@/types/workflows';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import { stringifyEvidenceRequired } from '@/utils/workflows';

const emit = defineEmits<{
  created: [definition: WorkflowDefinition];
  cancel: [];
}>();

const { createDefinition } = useWorkflowDefinitions();

const form = reactive<WorkflowDefinitionCreate>({
  name: '',
  description: '',
  version: '1.0.0',
  suggestedCadence: undefined,
  evidenceRequired: stringifyEvidenceRequired([]),
});

const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const selectedEvidenceTypes = ref<EvidenceType[]>([]);

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

watch(selectedEvidenceTypes, (newTypes) => {
  form.evidenceRequired = stringifyEvidenceRequired(newTypes);
});

function validate(): boolean {
  // Clear previous errors
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.name?.trim()) {
    errors.name = 'Name is required';
    return false;
  }

  if (form.name.length > 255) {
    errors.name = 'Name must be less than 255 characters';
    return false;
  }

  return true;
}

async function handleSubmit() {
  if (!validate()) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await createDefinition(form, (definition) => {
      emit('created', definition);
    });
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create definition';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
