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
    <Dialog v-model:visible="showCreateModal" size="lg" modal :header="dialogHeader">
      <ImportSspForm
        :poam-id="poamId"
        :import-ssp="undefined"
        @cancel="showCreateModal = false"
        @saved="handleImportSspSaved"
      />
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:visible="showEditModal" size="lg" modal :header="dialogHeader">
      <ImportSspForm
        :poam-id="poamId"
        :import-ssp="importSsp || undefined"
        @cancel="showEditModal = false"
        @saved="handleImportSspSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { ImportSsp } from '@/stores/plan-of-action-and-milestones.ts';
import ImportSspForm from '@/components/poam/ImportSspForm.vue';
import Dialog from '@/volt/Dialog.vue';
import { useDataApi } from '@/composables/axios';
import { getPoamIdFromRoute } from '../../utils/get-poam-id-from-route';

const route = useRoute();

const showCreateModal = ref(false);
const showEditModal = ref(false);

const poamId = computed(() => getPoamIdFromRoute(route));

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

const dialogHeader = computed(() =>
  showCreateModal.value ? 'Create Import SSP' : 'Edit Import SSP',
);
</script>
