<template>
  <div class="flex justify-between items-center mb-6">
    <div>
      <PageHeader>Workflow Definitions</PageHeader>
      <PageSubHeader>
        Manage workflow templates for continuous compliance activities
      </PageSubHeader>
    </div>
    <PrimaryButton @click="toggleCreating">
      <i class="pi pi-plus mr-2"></i>
      New Definition
    </PrimaryButton>
  </div>

  <!-- Filters -->
  <div class="mb-4 flex gap-4 items-center">
    <div class="flex-1">
      <InputText
        v-model="searchQuery"
        placeholder="Search definitions..."
        class="w-full max-w-md"
        @input="debouncedSearch"
      />
    </div>
    <Select
      v-model="statusFilter"
      :options="statusOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Filter by status"
      class="w-48"
      showClear
    />
  </div>

  <!-- Loading State -->
  <div v-if="!definitionsLoaded" class="text-center py-12">
    <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
    <p class="mt-4 text-gray-500 dark:text-slate-400">
      Loading workflow definitions...
    </p>
  </div>

  <!-- Empty State -->
  <div
    v-else-if="!definitions || definitions.length === 0"
    class="text-center py-12"
  >
    <i class="pi pi-inbox text-6xl text-gray-300 dark:text-slate-600"></i>
    <p class="mt-4 text-gray-500 dark:text-slate-400">
      No workflow definitions found.
    </p>
    <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
      Click "New Definition" to create your first workflow template.
    </p>
  </div>

  <!-- Definitions Table -->
  <div
    v-else
    class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <table class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Name
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Version
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Cadence
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Status
          </th>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Steps
          </th>
          <th
            class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="definition in definitions"
          :key="definition.id"
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
        >
          <td class="px-6 py-4">
            <div class="text-sm font-medium text-gray-900 dark:text-slate-300">
              {{ definition.name }}
            </div>
            <div
              v-if="definition.description"
              class="text-sm text-gray-500 dark:text-slate-400 truncate max-w-md"
            >
              {{ definition.description }}
            </div>
          </td>
          <td
            class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
          >
            {{ definition.version || '1.0.0' }}
          </td>
          <td
            class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
          >
            <span v-if="definition.suggestedCadence" class="capitalize">
              {{ formatCadence(definition.suggestedCadence) }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <Badge :severity="getStatusSeverity(definition.status)">
              {{ definition.status }}
            </Badge>
          </td>
          <td
            class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap"
          >
            {{ definition.stepCount ?? 0 }}
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex gap-2 justify-end">
              <RouterLinkButton
                :to="{
                  name: 'workflow-definition-editor',
                  params: { id: definition.id },
                }"
              >
                Edit
              </RouterLinkButton>
              <SecondaryButton
                @click="handleDelete(definition)"
                severity="danger"
              >
                Delete
              </SecondaryButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Create Dialog -->
  <Dialog
    header="Create Workflow Definition"
    :draggable="false"
    v-model:visible="creating"
    modal
    class="w-full max-w-2xl"
  >
    <WorkflowDefinitionCreateForm
      @created="definitionCreated"
      @cancel="setCreating(false)"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowDefinitions } from '@/composables/workflows';
import type {
  WorkflowDefinition,
  WorkflowDefinitionStatus,
  CadenceType,
} from '@/types/workflows';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import InputText from '@/volt/InputText.vue';
import Select from '@/volt/Select.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import WorkflowDefinitionCreateForm from './partials/WorkflowDefinitionCreateForm.vue';
import { useToggle } from '@/composables/useToggle';

const router = useRouter();

const { definitions, definitionsLoaded, listDefinitions, deleteDefinition } =
  useWorkflowDefinitions();

const {
  value: creating,
  toggle: toggleCreating,
  set: setCreating,
} = useToggle(false);

const searchQuery = ref('');
const statusFilter = ref<WorkflowDefinitionStatus | null>(null);

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Deprecated', value: 'deprecated' },
];

function formatCadence(cadence: CadenceType): string {
  if (cadence.startsWith('cron:')) {
    return `Custom (${cadence.slice(5)})`;
  }
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    on_demand: 'On Demand',
  };
  return labels[cadence] || cadence;
}

function getStatusSeverity(
  status: WorkflowDefinitionStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  const severities: Record<
    WorkflowDefinitionStatus,
    'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
  > = {
    draft: 'secondary',
    published: 'success',
    deprecated: 'warn',
  };
  return severities[status] || 'secondary';
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadDefinitions();
  }, 300);
}

async function loadDefinitions() {
  await listDefinitions({
    status: statusFilter.value || undefined,
    search: searchQuery.value || undefined,
  });
}

async function handleDelete(definition: WorkflowDefinition) {
  await deleteDefinition(definition.id, definition.name, () => {
    // Remove from local list
    if (definitions.value) {
      const idx = definitions.value.findIndex((d) => d.id === definition.id);
      if (idx >= 0) {
        definitions.value.splice(idx, 1);
      }
    }
  });
}

function definitionCreated(definition: WorkflowDefinition) {
  setCreating(false);
  // Navigate to the editor for the new definition
  router.push({
    name: 'workflow-definition-editor',
    params: { id: definition.id },
  });
}

onMounted(() => {
  loadDefinitions();
});
</script>
