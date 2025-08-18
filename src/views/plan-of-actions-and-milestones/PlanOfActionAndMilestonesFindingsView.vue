<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">
        Findings
      </h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add Finding
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading findings...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading findings: {{ error }}</p>
    </div>

    <div v-else-if="!findings?.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No findings found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="finding in findings"
        :key="finding.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">
              {{ finding.title || 'Untitled Finding' }}
            </h3>
            <p class="text-gray-600 dark:text-slate-400 mt-2">
              {{ finding.description }}
            </p>

            <div v-if="finding.target" class="mt-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >
                Target
              </h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">
                {{ JSON.stringify(finding.target) }}
              </p>
            </div>

            <div v-if="finding.status" class="mt-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >
                Status
              </h4>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {{ finding.status.state }}
              </span>
            </div>

            <div v-if="finding.implementationStatus" class="mt-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >
                Implementation Status
              </h4>
              <p class="text-sm text-gray-600 dark:text-slate-400">
                {{ JSON.stringify(finding.implementationStatus) }}
              </p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-if="finding.relatedObservations?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {{ finding.relatedObservations.length }} Related Observations
              </span>
              <span
                v-if="finding.relatedRisks?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              >
                {{ finding.relatedRisks.length }} Related Risks
              </span>
            </div>
          </div>

          <div class="ml-4 flex gap-2">
            <button
              @click="editFinding(finding)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Edit
            </button>
            <button
              @click="deleteFinding(finding.uuid || '')"
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <FindingCreateForm
        :poam-id="route.params.id as string"
        @cancel="showCreateModal = false"
        @created="handleFindingCreated"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal
      :show="showEditModal && editingFinding !== null"
      @close="showEditModal = false"
      size="lg"
    >
      <FindingEditForm
        v-if="editingFinding"
        :poam-id="route.params.id as string"
        :finding="editingFinding"
        @cancel="showEditModal = false"
        @saved="handleFindingSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Finding } from '@/stores/plan-of-action-and-milestones.ts';
import Modal from '@/components/Modal.vue';
import FindingCreateForm from '@/components/poam/FindingCreateForm.vue';
import FindingEditForm from '@/components/poam/FindingEditForm.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';

const route = useRoute();
const toast = useToast();

const {
  data: findings,
  error,
  isLoading: loading,
  execute: loadFindings,
} = useDataApi<Finding[]>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}/findings`,
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
const editingFinding = ref<Finding | null>(null);

// Finding management
const editFinding = (finding: Finding) => {
  editingFinding.value = finding;
  showEditModal.value = true;
};

const handleFindingCreated = (newFinding: Finding) => {
  if (!findings.value) {
    findings.value = [];
  }
  findings.value.push(newFinding);
  showCreateModal.value = false;
};

const handleFindingSaved = (updatedFinding: Finding) => {
  if (!findings.value) {
    findings.value = [];
  }
  const index = findings.value.findIndex(
    (finding) => finding.uuid === updatedFinding.uuid,
  );
  if (index !== -1) {
    findings.value[index] = updatedFinding;
  }
  showEditModal.value = false;
  editingFinding.value = null;
};

async function deleteFinding(uuid: string) {
  if (!uuid || !confirm('Are you sure you want to delete this finding?')) {
    return;
  }

  try {
    const id = route.params.id as string;
    await executeDelete(
      `/api/oscal/plan-of-action-and-milestones/${id}/findings/${uuid}`,
    );

    toast.add({
      severity: 'success',
      summary: 'Finding Deleted',
      detail: 'Finding deleted successfully',
      life: 3000,
    });

    await loadFindings(); // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete finding: ${errorMessage}`,
      life: 3000,
    });
  }
}
</script>
