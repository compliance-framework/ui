<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-300">
        POAM Items
      </h2>
      <button
        @click="showCreateModal = true"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
      >
        Add POAM Item
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading POAM items...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading POAM items: {{ error }}</p>
    </div>

    <div v-else-if="poamItems && !poamItems.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No POAM items found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in poamItems"
        :key="item.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <CollapsableGroup>
          <template #header="{ isOpen }">
            <div class="flex justify-between items-center p-6">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <svg
                    class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform duration-200"
                    :class="{ 'rotate-90': isOpen }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    ></path>
                  </svg>
                  <h3
                    class="text-lg font-medium text-gray-900 dark:text-slate-300"
                  >
                    {{ item.title }}
                  </h3>
                </div>
                <p class="text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {{ item.description }}
                </p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-if="item.relatedFindings?.length"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {{ item.relatedFindings.length }} Findings
                  </span>
                  <span
                    v-if="item.relatedObservations?.length"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {{ item.relatedObservations.length }} Observations
                  </span>
                  <span
                    v-if="item.relatedRisks?.length"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  >
                    {{ item.relatedRisks.length }} Risks
                  </span>
                </div>
              </div>

              <div class="ml-4 flex gap-2">
                <button
                  @click.stop="attachItems(item)"
                  class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Attach / Detach Items
                </button>
                <button
                  @click.stop="editItem(item)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Edit
                </button>
                <button
                  @click.stop="
                    confirmDeleteDialog(() => deleteItem(item.uuid!), {
                      itemType: 'POAM item',
                    })
                  "
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </template>

          <div class="px-6 pb-6">
            <PoamItemDetails :item="item" :poam-id="poamId" />
          </div>
        </CollapsableGroup>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog
      v-model:visible="showCreateModal"
      size="lg"
      modal
      header="Create POAM Item"
    >
      <PoamItemCreateForm
        :poam-id="poamId"
        @cancel="showCreateModal = false"
        @created="handleItemCreated"
      />
    </Dialog>

    <!-- Edit Modal -->
    <Dialog
      v-model:visible="showEditModal"
      size="lg"
      modal
      header="Edit POAM Item"
    >
      <PoamItemEditForm
        v-if="editingItem"
        :poam-id="poamId"
        :item="editingItem"
        @cancel="showEditModal = false"
        @saved="handleItemSaved"
      />
    </Dialog>

    <!-- Attach Modal -->
    <Dialog
      v-model:visible="showAttachModal"
      size="lg"
      header="Attach / Detach Items to POAM Item"
    >
      <PoamItemAttachModal
        v-if="attachingItem"
        :poam-id="poamId"
        :item="attachingItem"
        @cancel="showAttachModal = false"
        @saved="handleItemAttached"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { POAMItem } from '@/stores/plan-of-action-and-milestones.ts';
import Dialog from '@/volt/Dialog.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import PoamItemDetails from '@/components/poam/PoamItemDetails.vue';
import PoamItemCreateForm from '@/components/poam/PoamItemCreateForm.vue';
import PoamItemEditForm from '@/components/poam/PoamItemEditForm.vue';
import PoamItemAttachModal from '@/components/poam/PoamItemAttachModal.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { getIdFromRoute } from '../../utils/get-poam-id-from-route';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const route = useRoute();
const toast = useToast();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const {
  data: poamItems,
  isLoading: loading,
  error,
  execute: refreshItems,
} = useDataApi<POAMItem[]>(
  `/api/oscal/plan-of-action-and-milestones/${route.params.id}/poam-items`,
);
const { execute: deletePoamItem } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

// Modal states
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showAttachModal = ref(false);

// Edit targets
const editingItem = ref<POAMItem | null>(null);
const attachingItem = ref<POAMItem | null>(null);

const poamId = computed(() => getIdFromRoute(route));

// Item management
const editItem = (item: POAMItem) => {
  editingItem.value = item;
  showEditModal.value = true;
};

const handleItemCreated = (newItem: POAMItem) => {
  if (!poamItems.value) return;
  poamItems.value.push(newItem);
  showCreateModal.value = false;
};

const handleItemSaved = (updatedItem: POAMItem) => {
  if (!poamItems.value) return;
  const index = poamItems.value.findIndex(
    (item) => item.uuid === updatedItem.uuid,
  );
  if (index !== -1) {
    poamItems.value[index] = updatedItem;
  }
  showEditModal.value = false;
  editingItem.value = null;
};

async function deleteItem(uuid: string) {
  try {
    const id = route.params.id as string;
    await deletePoamItem(
      `/api/oscal/plan-of-action-and-milestones/${id}/poam-items/${uuid}`,
    );

    toast.add({
      severity: 'success',
      summary: 'POAM Item Deleted',
      detail: 'POAM item deleted successfully',
      life: 3000,
    });

    await refreshItems(); // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete POAM item: ${errorMessage}`,
      life: 3000,
    });
  }
}

const attachItems = (item: POAMItem) => {
  attachingItem.value = item;
  showAttachModal.value = true;
};

const handleItemAttached = (updatedItem: POAMItem) => {
  if (!poamItems.value) return;
  const index = poamItems.value.findIndex(
    (item) => item.uuid === updatedItem.uuid,
  );
  if (index !== -1) {
    poamItems.value[index] = updatedItem;
  }
  showAttachModal.value = false;
  attachingItem.value = null;
};
</script>
