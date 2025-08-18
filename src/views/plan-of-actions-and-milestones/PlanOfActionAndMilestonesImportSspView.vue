<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">
        Import SSP
      </h2>
      <div class="flex gap-2">
        <button
          v-if="importSsp"
          @click="showEditModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit Import SSP
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">
        Loading import SSP data...
      </p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading import SSP data: {{ error }}</p>
    </div>

    <div
      v-else-if="importSsp"
      class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6"
    >
      <div class="space-y-4">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Href</label
          >
          <p
            class="text-gray-900 dark:text-slate-300 font-mono text-sm break-all"
          >
            {{ importSsp.href }}
          </p>
        </div>

        <div v-if="importSsp.remarks">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Remarks</label
          >
          <p class="text-gray-900 dark:text-slate-300 whitespace-pre-wrap">
            {{ importSsp.remarks }}
          </p>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">
        No import SSP data available.
      </p>
      <button
        @click="showCreateModal = true"
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Create Import SSP
      </button>
    </div>

    <!-- Create Modal -->
    <Modal :show="showCreateModal" @close="showCreateModal = false" size="lg">
      <ImportSspForm
        :poam-id="route.params.id as string"
        :import-ssp="undefined"
        @cancel="showCreateModal = false"
        @saved="handleImportSspSaved"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :show="showEditModal" @close="showEditModal = false" size="lg">
      <ImportSspForm
        :poam-id="route.params.id as string"
        :import-ssp="importSsp || undefined"
        @cancel="showEditModal = false"
        @saved="handleImportSspSaved"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import type { ImportSsp } from '@/stores/plan-of-action-and-milestones.ts';
import Modal from '@/components/Modal.vue';
import ImportSspForm from '@/components/poam/ImportSspForm.vue';
import { useDataApi } from '@/composables/axios';

const route = useRoute();

const showCreateModal = ref(false);
const showEditModal = ref(false);

const {
  data: importSsp,
  isLoading: loading,
  error,
} = useDataApi<ImportSsp | null>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}/import-ssp`,
);

function handleImportSspSaved(savedImportSsp: ImportSsp) {
  importSsp.value = savedImportSsp;
  showCreateModal.value = false;
  showEditModal.value = false;
}
</script>
