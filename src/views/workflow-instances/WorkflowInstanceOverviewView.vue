<template>
  <div v-if="store.instance" class="space-y-6">
    <!-- Edit Form -->
    <form @submit.prevent="handleSubmit" class="max-w-2xl">
      <div class="space-y-6">
        <!-- Name -->
        <div>
          <Label for="name" required>Name</Label>
          <InputText
            id="name"
            v-model="form.name"
            placeholder="Enter instance name"
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
            placeholder="Describe this workflow instance..."
            rows="3"
            class="w-full"
          />
        </div>

        <!-- Cadence -->
        <div>
          <Label for="cadence" required>Execution Cadence</Label>
          <Select
            id="cadence"
            v-model="selectedCadence"
            :options="cadenceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select cadence"
            class="w-full"
          />
        </div>

        <!-- Custom Cron Expression -->
        <div v-if="selectedCadence === 'custom'">
          <Label for="cronExpression" required
            >Cron Expression (6 fields)</Label
          >
          <InputText
            id="cronExpression"
            v-model="cronExpression"
            placeholder="* * * * * *"
            class="w-full font-mono"
          />
          <small class="text-gray-500 dark:text-slate-400">
            Format: second minute hour day month weekday
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

    <!-- Workflow Definition Info -->
    <div class="border-t border-gray-200 dark:border-slate-700 pt-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
        Workflow Definition
      </h3>
      <div class="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <div v-if="store.instance.workflowDefinition">
          <h4 class="font-medium text-gray-900 dark:text-slate-200">
            {{ store.instance.workflowDefinition.name }}
          </h4>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {{ store.instance.workflowDefinition.description }}
          </p>
          <div class="mt-2">
            <RouterLink
              :to="{
                name: 'workflow-definition-editor',
                params: { id: store.instance.workflowDefinitionId },
              }"
              class="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View Definition
            </RouterLink>
          </div>
        </div>
        <div v-else>
          <p class="text-sm text-gray-500 dark:text-slate-400">
            Definition ID: {{ store.instance.workflowDefinitionId }}
          </p>
        </div>
      </div>
    </div>

    <!-- Metadata -->
    <div class="border-t border-gray-200 dark:border-slate-700 pt-6 mt-8">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
        Metadata
      </h3>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-gray-500 dark:text-slate-400">ID</dt>
          <dd class="font-mono text-gray-900 dark:text-slate-200">
            {{ store.instance.id }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Status</dt>
          <dd class="text-gray-900 dark:text-slate-200 capitalize">
            {{ store.instance.status }}
          </dd>
        </div>
        <div v-if="store.instance.systemId">
          <dt class="text-gray-500 dark:text-slate-400">System ID</dt>
          <dd class="font-mono text-gray-900 dark:text-slate-200">
            {{ store.instance.systemId }}
          </dd>
        </div>
        <div v-if="store.instance.controlId">
          <dt class="text-gray-500 dark:text-slate-400">Control ID</dt>
          <dd class="font-mono text-gray-900 dark:text-slate-200">
            {{ store.instance.controlId }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Created</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ formatDate(store.instance.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Last Updated</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ formatDate(store.instance.updatedAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Last Execution</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{
              store.instance.lastExecutionAt
                ? formatDate(store.instance.lastExecutionAt)
                : 'Never'
            }}
          </dd>
        </div>
        <div>
          <dt class="text-gray-500 dark:text-slate-400">Total Executions</dt>
          <dd class="text-gray-900 dark:text-slate-200">
            {{ store.executions.length }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useToast } from 'primevue/usetoast';
import type { WorkflowInstanceUpdate, CadenceType } from '@/types/workflows';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

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

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

// Initialize form when instance loads
watch(
  () => store.instance,
  () => {
    initForm();
  },
  { immediate: true },
);
</script>
