<template>
  <PageHeader>
    Inventory
    <template #menu>
      <BurgerMenu
        :items="[
          {
            label: 'Create New',
            command: () => {
              showCreateInventoryItemModal = true;
            },
          },
        ]"
      />
    </template>
  </PageHeader>
  <PageSubHeader>Manage system inventory</PageSubHeader>

  <div class="mt-4">
    <div v-if="inventoryItemsLoading" class="text-center py-4">
      <p class="text-gray-500 dark:text-slate-400">
        Loading inventory items...
      </p>
    </div>

    <div v-else-if="inventoryItems?.length === 0" class="text-center py-4">
      <p class="text-gray-500 dark:text-slate-400">
        No inventory items defined.
      </p>
    </div>

    <Panel
      v-for="item in inventoryItems"
      :key="item.uuid"
      toggleable
      collapsed
      class="my-2"
    >
      <template #header>
        <div class="flex items-center gap-2 py-2">
          <span class="font-bold">{{
            firstOfProps(item.props, 'asset-id')?.value
          }}</span>
          <Badge
            :value="firstOfProps(item.props, 'asset-type')?.value"
            severity="info"
          />
        </div>
      </template>
      <div
        class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
      >
        <div class="py-3 px-4 flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <span class="font-medium text-gray-900 dark:text-slate-300">{{
              item.description || 'Inventory Item'
            }}</span>
            <span
              class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono"
            >
              {{ item.uuid.substring(0, 8) }}...
            </span>
          </div>
          <div class="flex gap-2">
            <button
              @click.stop="editInventoryItem(item)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
            <button
              @click.stop="attachInventoryItem(item)"
              class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
            >
              Attach
            </button>
            <button
              @click.stop="downloadInventoryItemJSON(item)"
              class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              JSON
            </button>
            <button
              @click.stop="deleteInventoryItem(item)"
              class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
          {{ item.description }}
        </p>

        <div v-if="item.implementedComponents?.length" class="space-y-2">
          <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
            >Implemented Components:</span
          >
          <div
            v-for="impl in item.implementedComponents"
            :key="impl.componentUuid"
            class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
          >
            <div class="font-medium text-sm font-mono">
              {{ impl.componentUuid }}
            </div>
            <div
              v-if="impl.remarks"
              class="text-xs text-gray-600 dark:text-slate-400 mt-1"
            >
              {{ impl.remarks }}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  </div>

  <!-- Inventory Item Create Modal -->
  <Modal
    :show="showCreateInventoryItemModal"
    @close="showCreateInventoryItemModal = false"
  >
    <SystemImplementationInventoryItemCreateForm
      :ssp-id="system.securityPlan?.uuid as string"
      @cancel="showCreateInventoryItemModal = false"
      @created="handleInventoryItemCreated"
    />
  </Modal>

  <!-- Inventory Item Edit Modal -->
  <Modal
    :show="!!(showEditInventoryItemModal && editingInventoryItem)"
    @close="showEditInventoryItemModal = false"
  >
    <SystemImplementationInventoryItemEditForm
      :ssp-id="system.securityPlan?.uuid as string"
      :inventory-item="editingInventoryItem!"
      @cancel="showEditInventoryItemModal = false"
      @saved="handleInventoryItemSaved"
    />
  </Modal>

  <!-- Inventory Item Attach Modal -->
  <Modal
    :show="showInventoryItemAttachModal"
    @close="showInventoryItemAttachModal = false"
  >
    <SystemImplementationInventoryItemAttachModal
      :ssp-id="system.securityPlan?.uuid as string"
      :item="editingInventoryItem!"
      @cancel="showInventoryItemAttachModal = false"
      @saved="handleInventoryItemAttached"
    />
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { InventoryItem } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import decamelizeKeys from 'decamelize-keys';
import SystemImplementationInventoryItemEditForm from '@/components/system-security-plans/SystemImplementationInventoryItemEditForm.vue';
import Modal from '@/components/Modal.vue';
import SystemImplementationInventoryItemAttachModal from '@/components/system-security-plans/SystemImplementationInventoryItemAttachModal.vue';
import SystemImplementationInventoryItemCreateForm from '@/components/system-security-plans/SystemImplementationInventoryItemCreateForm.vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Panel from '@/volt/Panel.vue';
import Badge from '@/volt/Badge.vue';
import { useProps } from '@/composables/useProps';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import { useRouter } from 'vue-router';

const toast = useToast();
const { system } = useSystemStore();
const router = useRouter();

const {
  data: inventoryItems,
  isLoading: inventoryItemsLoading,
  execute: loadInventoryItems,
} = useDataApi<InventoryItem[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/inventory-items`,
  null,
  { immediate: false },
);

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

onMounted(async () => {
  if (!system.securityPlan?.uuid) {
    toast.add({
      severity: 'error',
      summary: 'No Security Plan set',
      detail: 'Please select or create a security plan.',
      life: 5000,
    });
    await router.push({ name: 'system-security-plans' });
  }
  try {
    await loadInventoryItems();
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Failed to load inventory items',
      detail:
        errorResponse.response?.data?.errors?.body ||
        'An unknown error occurred.',
      life: 5000,
    });
  }
});

const menu = ref();

const editingInventoryItem = ref<InventoryItem | null>(null);
const showCreateInventoryItemModal = ref(false);
const showEditInventoryItemModal = ref(false);
const showInventoryItemAttachModal = ref(false);

const { firstOfProps } = useProps();

function toggleMenu(event: Event) {
  menu.value.toggle(event);
}

// Inventory Item management
const editInventoryItem = (item: InventoryItem) => {
  editingInventoryItem.value = item;
  showEditInventoryItemModal.value = true;
};

const handleInventoryItemCreated = (newItem: InventoryItem) => {
  inventoryItems.value?.push(newItem);
  showCreateInventoryItemModal.value = false;
};

const handleInventoryItemSaved = (updatedItem: InventoryItem) => {
  if (inventoryItems.value) {
    const index = inventoryItems.value.findIndex(
      (i) => i.uuid === updatedItem.uuid,
    );
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
  }
  showEditInventoryItemModal.value = false;
  editingInventoryItem.value = null;
};

const handleInventoryItemAttached = (updatedItem: InventoryItem) => {
  if (inventoryItems.value) {
    const index = inventoryItems.value.findIndex(
      (i) => i.uuid === updatedItem.uuid,
    );
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
  }
  showInventoryItemAttachModal.value = false;
  editingInventoryItem.value = null;
};

function attachInventoryItem(item: InventoryItem) {
  editingInventoryItem.value = item;
  showInventoryItemAttachModal.value = true;
}

const deleteInventoryItem = async (item: InventoryItem) => {
  if (
    !confirm(
      `Are you sure you want to delete inventory item "${item.description || item.uuid}"?`,
    )
  ) {
    return;
  }

  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/inventory-items/${item.uuid}`,
    );
    if (inventoryItems.value) {
      inventoryItems.value = inventoryItems.value.filter(
        (i) => i.uuid !== item.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Inventory item deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete inventory item. Please try again.',
      life: 5000,
    });
  }
};

const downloadInventoryItemJSON = (item: InventoryItem) => {
  const dataStr = JSON.stringify(decamelizeKeys(item), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-item-${item.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
</script>
