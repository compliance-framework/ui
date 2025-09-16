<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">
        Risks
      </h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Risk
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading risks...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading risks: {{ error }}</p>
    </div>

    <div v-else-if="!risks?.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No risks found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="risk in risks"
        :key="risk.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">
              {{ risk.title || 'Untitled Risk' }}
            </h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">
              {{ risk.description }}
            </p>

            <div v-if="risk.statement" class="mt-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >
                Statement
              </h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">
                {{ risk.statement }}
              </p>
            </div>

            <div class="mt-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >
                Status
              </h4>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {{ risk.status }}
              </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-if="risk.threatIds?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              >
                {{ risk.threatIds.length }} Threats
              </span>
              <span
                v-if="risk.characterizations?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {{ risk.characterizations.length }} Characterizations
              </span>
              <span
                v-if="risk.mitigatingFactors?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {{ risk.mitigatingFactors.length }} Mitigating Factors
              </span>
              <span
                v-if="risk.remediations?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                {{ risk.remediations.length }} Remediations
              </span>
            </div>

            <div
              v-if="risk.deadline"
              class="mt-3 text-sm text-gray-500 dark:text-slate-400"
            >
              <strong>Deadline:</strong> {{ formatDate(risk.deadline) }}
            </div>
          </div>

          <div class="ml-4 flex gap-2">
            <button
              @click="editRisk(risk)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="
                confirmDeleteDialog(() => deleteRisk(risk.uuid!), {
                  itemType: 'risk',
                })
              "
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog
      v-model:visible="showCreateModal"
      size="lg"
      modal
      header="Create Risk"
    >
      <RiskCreateForm
        :poam-id="poamId"
        @cancel="showCreateModal = false"
        @created="handleRiskCreated"
      />
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:visible="showEditModal" size="lg" modal header="Edit Risk">
      <RiskEditForm
        v-if="editingRisk"
        :poam-id="poamId"
        :risk="editingRisk"
        @cancel="showEditModal = false"
        @saved="handleRiskSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Risk } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import RiskCreateForm from '@/components/poam/RiskCreateForm.vue';
import RiskEditForm from '@/components/poam/RiskEditForm.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { getIdFromRoute } from '../../utils/get-poam-id-from-route';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const route = useRoute();
const toast = useToast();

const poamId = computed(() => getIdFromRoute(route));

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const {
  data: risks,
  error,
  isLoading: loading,
  execute: loadRisks,
} = useDataApi<Risk[]>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}/risks`,
);
const { execute: executeDelete } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

// Modal states
const showCreateModal = ref(false);
const showEditModal = ref(false);

// Edit targets
const editingRisk = ref<Risk | null>(null);

// Risk management
const editRisk = (risk: Risk) => {
  editingRisk.value = risk;
  showEditModal.value = true;
};

const handleRiskCreated = (newRisk: Risk) => {
  if (!risks.value) {
    risks.value = [];
  }
  risks.value.push(newRisk);
  showCreateModal.value = false;
};

const handleRiskSaved = (updatedRisk: Risk) => {
  if (!risks.value) {
    risks.value = [];
  }
  const index = risks.value.findIndex((risk) => risk.uuid === updatedRisk.uuid);
  if (index !== -1) {
    risks.value[index] = updatedRisk;
  }
  showEditModal.value = false;
  editingRisk.value = null;
};

async function deleteRisk(uuid: string) {
  try {
    const id = route.params.id as string;
    await executeDelete(
      `/api/oscal/plan-of-action-and-milestones/${id}/risks/${uuid}`,
    );

    toast.add({
      severity: 'success',
      summary: 'Risk Deleted',
      detail: 'Risk deleted successfully',
      life: 3000,
    });

    await loadRisks(); // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete risk: ${errorMessage}`,
      life: 3000,
    });
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
