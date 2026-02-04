<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Workflow Definition -->
    <div>
      <Label for="definition" required>Workflow Definition</Label>
      <Select
        id="definition"
        v-model="form.workflowDefinitionId"
        :options="definitionOptions"
        optionLabel="name"
        optionValue="id"
        placeholder="Select a workflow definition"
        class="w-full"
        :invalid="!!errors.workflowDefinitionId"
        @change="onDefinitionChange"
      />
      <small v-if="errors.workflowDefinitionId" class="text-red-500">
        {{ errors.workflowDefinitionId }}
      </small>
    </div>

    <!-- Selected Definition Preview -->
    <div
      v-if="selectedDefinition"
      class="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
    >
      <h4 class="font-medium text-gray-900 dark:text-slate-200">
        {{ selectedDefinition.name }}
      </h4>
      <p
        v-if="selectedDefinition.description"
        class="text-sm text-gray-500 dark:text-slate-400 mt-1"
      >
        {{ selectedDefinition.description }}
      </p>
      <div class="flex gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
        <span>Version: {{ selectedDefinition.version || '1.0.0' }}</span>
        <span v-if="selectedDefinition.suggestedCadence">
          Suggested Cadence:
          {{ formatCadence(selectedDefinition.suggestedCadence) }}
        </span>
        <span>Steps: {{ selectedDefinition.stepCount ?? 0 }}</span>
      </div>
    </div>

    <!-- Name -->
    <div>
      <Label for="name" required>Instance Name</Label>
      <InputText
        id="name"
        v-model="form.name"
        placeholder="Enter a name for this instance"
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
        placeholder="Describe the purpose of this workflow instance..."
        rows="2"
        class="w-full"
      />
    </div>

    <!-- Cadence -->
    <div>
      <Label for="cadence" required>Execution Cadence</Label>
      <Select
        id="cadence"
        v-model="form.cadence"
        :options="cadenceOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select cadence"
        class="w-full"
        :invalid="!!errors.cadence"
      />
      <small v-if="errors.cadence" class="text-red-500">
        {{ errors.cadence }}
      </small>
      <small v-else class="text-gray-500 dark:text-slate-400">
        How often should this workflow be executed?
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
        Create Instance
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import {
  useWorkflowInstances,
  useWorkflowDefinitions,
} from '@/composables/workflows';
import type {
  WorkflowInstance,
  WorkflowInstanceCreate,
  WorkflowDefinition,
  CadenceType,
} from '@/types/workflows';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

const props = defineProps<{
  preselectedDefinitionId?: string;
  preselectedSystemId?: string;
  preselectedControlId?: string;
}>();

const emit = defineEmits<{
  created: [instance: WorkflowInstance];
  cancel: [];
}>();

const { createInstance } = useWorkflowInstances();
const { definitions, listDefinitions } = useWorkflowDefinitions();
const definitionOptions = computed<WorkflowDefinition[]>(
  () => definitions.value ?? [],
);

const form = reactive<WorkflowInstanceCreate>({
  workflowDefinitionId: props.preselectedDefinitionId || '',
  name: '',
  description: '',
  cadence: 'monthly',
  systemId: props.preselectedSystemId,
  controlId: props.preselectedControlId,
});

const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

const cadenceOptions: Array<{ label: string; value: CadenceType }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
  { label: 'On Demand', value: 'on_demand' },
];

const selectedDefinition = computed<WorkflowDefinition | undefined>(() => {
  if (!form.workflowDefinitionId) return undefined;
  return definitions.value?.find((d) => d.id === form.workflowDefinitionId);
});

function formatCadence(cadence: CadenceType): string {
  const labels: Record<CadenceType, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    on_demand: 'On Demand',
  };
  return labels[cadence] || cadence;
}

function onDefinitionChange() {
  // Auto-populate name and cadence from definition
  if (selectedDefinition.value) {
    if (!form.name) {
      form.name = `${selectedDefinition.value.name} Instance`;
    }
    if (selectedDefinition.value.suggestedCadence) {
      form.cadence = selectedDefinition.value.suggestedCadence;
    }
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.workflowDefinitionId) {
    errors.workflowDefinitionId = 'Please select a workflow definition';
    return false;
  }

  if (!form.name?.trim()) {
    errors.name = 'Instance name is required';
    return false;
  }

  if (!form.cadence) {
    errors.cadence = 'Please select a cadence';
    return false;
  }

  return true;
}

async function handleSubmit() {
  if (!validate()) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await createInstance(form, (instance) => {
      emit('created', instance);
    });
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create instance';
  } finally {
    isSubmitting.value = false;
  }
}

// Handle preselected definition
watch(
  () => props.preselectedDefinitionId,
  (val) => {
    if (val) {
      form.workflowDefinitionId = val;
      onDefinitionChange();
    }
  },
);

onMounted(async () => {
  await listDefinitions();
  if (props.preselectedDefinitionId) {
    form.workflowDefinitionId = props.preselectedDefinitionId;
    onDefinitionChange();
  }
});
</script>
