<template>
  <div>
    <PageHeader>
      Inventory Plus
      <template #menu>
        <BurgerMenu
          :items="[
            {
              label: 'Create New',
              command: () => {
                showCreateInventoryItemModal = true;
              },
              disabled: false, // Allow creating unattached inventory
            },
          ]"
        />
      </template>
    </PageHeader>
    <PageSubHeader>All system inventory from all sources</PageSubHeader>

    <!-- Filters Section -->
    <div class="mb-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Source Filters -->
        <div>
          <label class="block text-sm font-medium mb-2">Sources</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="filters.includeSSP"
                class="mr-2"
              />
              System Security Plans
            </label>
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="filters.includeEvidence"
                class="mr-2"
              />
              Evidence Collection
            </label>
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="filters.includePOAM"
                class="mr-2"
              />
              Plan of Action & Milestones
            </label>
            <label class="flex items-center">
              <input type="checkbox" v-model="filters.includeAP" class="mr-2" />
              Assessment Plans
            </label>
            <label class="flex items-center">
              <input type="checkbox" v-model="filters.includeAR" class="mr-2" />
              Assessment Results
            </label>
          </div>
        </div>

        <!-- Item Type Filter -->
        <div>
          <label class="block text-sm font-medium mb-2">Item Type</label>
          <Select
            v-model="filters.itemType"
            :options="itemTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All types"
            class="w-full"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-medium mb-2">Status</label>
          <Select
            v-model="filters.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All statuses"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Statistics Bar -->
    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 text-sm">
          <span>
            <strong>{{ inventoryItems?.length || 0 }}</strong> total items
          </span>
          <span v-if="sourceStats.ssp > 0">
            <Badge value="SSP" severity="info" /> {{ sourceStats.ssp }}
          </span>
          <span v-if="sourceStats.evidence > 0">
            <Badge value="Evidence" severity="success" />
            {{ sourceStats.evidence }}
          </span>
          <span v-if="sourceStats.poam > 0">
            <Badge value="POAM" severity="warning" /> {{ sourceStats.poam }}
          </span>
          <span v-if="sourceStats.ap > 0">
            <Badge value="AP" severity="contrast" /> {{ sourceStats.ap }}
          </span>
          <span v-if="sourceStats.ar > 0">
            <Badge value="AR" severity="danger" /> {{ sourceStats.ar }}
          </span>
        </div>
        <button
          @click="() => loadInventoryItems()"
          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="mt-4">
      <div v-if="inventoryItemsLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">
          Loading inventory items...
        </p>
      </div>

      <div v-else-if="inventoryItems?.length === 0" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">
          No inventory items found with current filters.
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
              firstOfProps(item.props, 'asset-id')?.value || item.description
            }}</span>
            <Badge
              :value="
                firstOfProps(item.props, 'asset-type')?.value || 'unknown'
              "
              severity="info"
            />
            <Badge
              :value="item.sourceType"
              :severity="getSourceSeverity(item.sourceType)"
            />
            <span class="text-xs text-gray-500 dark:text-slate-400 ml-2">
              from {{ item.source }}
            </span>
          </div>
        </template>
        <div
          class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
        >
          <div class="py-3 px-4">
            <!-- Item Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span class="text-sm text-gray-600 dark:text-slate-400"
                  >Description:</span
                >
                <p class="font-medium text-gray-900 dark:text-slate-300">
                  {{ item.description || 'No description' }}
                </p>
              </div>
              <div>
                <span class="text-sm text-gray-600 dark:text-slate-400"
                  >Source:</span
                >
                <p class="font-medium text-gray-900 dark:text-slate-300">
                  {{ item.source }}
                  <span class="text-xs text-gray-500 dark:text-slate-500 ml-1">
                    ({{ item.sourceId.substring(0, 8) }}...)
                  </span>
                </p>
              </div>
            </div>

            <!-- UUID and Actions -->
            <div class="flex justify-between items-center">
              <span
                class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono"
              >
                {{ item.uuid.substring(0, 8) }}...
              </span>
              <div class="flex gap-2">
                <button
                  v-if="system.securityPlan && item.sourceType === 'ssp'"
                  @click.stop="editInventoryItem(item)"
                  class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  v-if="system.securityPlan && item.sourceType === 'ssp'"
                  @click.stop="attachInventoryItem(item)"
                  class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                >
                  Attach
                </button>
                <button
                  v-if="system.securityPlan && item.sourceType !== 'ssp'"
                  @click.stop="attachToSSP(item)"
                  class="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition-colors"
                >
                  Add to SSP
                </button>
                <button
                  @click.stop="downloadInventoryItemJSON(item)"
                  class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  JSON
                </button>
                <button
                  v-if="system.securityPlan && item.sourceType === 'ssp'"
                  @click.stop="
                    confirmDeleteDialog(() => deleteInventoryItem(item), {
                      itemName: item.description || item.uuid,
                      itemType: 'inventory item',
                    })
                  "
                  class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            <!-- Properties -->
            <div v-if="item.props && item.props.length > 0" class="mt-3">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Properties:
              </span>
              <div class="flex flex-wrap gap-2 mt-1">
                <Chip
                  v-for="prop in item.props"
                  :key="prop.name"
                  :label="`${prop.name}: ${prop.value}`"
                  class="text-xs"
                />
              </div>
            </div>

            <!-- Implemented Components -->
            <div v-if="item.implementedComponents?.length" class="mt-3">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Implemented Components:
              </span>
              <div
                v-for="impl in item.implementedComponents"
                :key="impl.componentUuid"
                class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600 mt-2"
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

            <!-- Remarks -->
            <div v-if="item.remarks" class="mt-3">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Remarks:
              </span>
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {{ item.remarks }}
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>

    <!-- Inventory Item Create Modal -->
    <Dialog v-model:visible="showCreateInventoryItemModal" modal>
      <InventoryItemCreateForm
        :ssp-id="system.securityPlan ? sspId : undefined"
        @cancel="showCreateInventoryItemModal = false"
        @created="handleInventoryItemCreated"
      />
    </Dialog>

    <!-- Inventory Item Edit Modal -->
    <Dialog v-model:visible="showEditInventoryItemModal" modal>
      <SystemImplementationInventoryItemEditForm
        v-if="system.securityPlan"
        :ssp-id="sspId"
        :inventory-item="editingInventoryItem!"
        @cancel="showEditInventoryItemModal = false"
        @saved="handleInventoryItemSaved"
      />
    </Dialog>

    <!-- Inventory Item Attach Modal -->
    <Dialog v-model:visible="showInventoryItemAttachModal" modal>
      <SystemImplementationInventoryItemAttachModal
        v-if="system.securityPlan"
        :ssp-id="sspId"
        :item="editingInventoryItem!"
        @cancel="showInventoryItemAttachModal = false"
        @saved="handleInventoryItemAttached"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive, watch } from 'vue';
import type { InventoryItem } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import decamelizeKeys from 'decamelize-keys';
import SystemImplementationInventoryItemEditForm from '@/components/system-security-plans/SystemImplementationInventoryItemEditForm.vue';
import Dialog from '@/volt/Dialog.vue';
import SystemImplementationInventoryItemAttachModal from '@/components/system-security-plans/SystemImplementationInventoryItemAttachModal.vue';
import InventoryItemCreateForm from '@/components/inventory/InventoryItemCreateForm.vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Panel from '@/volt/Panel.vue';
import Badge from '@/volt/Badge.vue';
import Chip from '@/volt/Chip.vue';
import Select from '@/volt/Select.vue';
import { useProps } from '@/composables/useProps';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

// Extended inventory item type with source information
interface InventoryItemWithSource extends InventoryItem {
  source: string;
  sourceId: string;
  sourceType: string;
}

const toast = useToast();
const { system } = useSystemStore();
const sspId = computed(() => system.securityPlan?.uuid ?? '');

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

// Filters state
const filters = reactive({
  includeSSP: true,
  includeEvidence: true,
  includePOAM: true,
  includeAP: false,
  includeAR: false,
  itemType: null as string | null,
  status: null as string | null,
});

// Filter options
const itemTypeOptions = [
  { label: 'All types', value: null },
  { label: 'Operating System', value: 'operating-system' },
  { label: 'Database', value: 'database' },
  { label: 'Web Server', value: 'web-server' },
  { label: 'Firewall', value: 'firewall' },
  { label: 'Router', value: 'router' },
  { label: 'Switch', value: 'switch' },
  { label: 'Appliance', value: 'appliance' },
  { label: 'DNS Server', value: 'dns-server' },
  { label: 'Email Server', value: 'email-server' },
  { label: 'Directory Server', value: 'directory-server' },
  { label: 'Storage Array', value: 'storage-array' },
];

const statusOptions = [
  { label: 'All statuses', value: null },
  { label: 'Operational', value: 'operational' },
  { label: 'Under Maintenance', value: 'under-maintenance' },
  { label: 'Planned', value: 'planned' },
  { label: 'Pending Approval', value: 'pending-approval' },
  { label: 'Disposed', value: 'disposed' },
];

// Build query parameters based on filters
const buildQueryParams = () => {
  const params = new URLSearchParams();

  if (
    !filters.includeSSP &&
    !filters.includeEvidence &&
    !filters.includePOAM &&
    !filters.includeAP &&
    !filters.includeAR
  ) {
    // If no sources selected, include all by default
    params.append('include_ssp', 'true');
    params.append('include_evidence', 'true');
    params.append('include_poam', 'true');
  } else {
    params.append('include_ssp', filters.includeSSP.toString());
    params.append('include_evidence', filters.includeEvidence.toString());
    params.append('include_poam', filters.includePOAM.toString());
    params.append('include_ap', filters.includeAP.toString());
    params.append('include_ar', filters.includeAR.toString());
  }

  if (filters.itemType) {
    params.append('item_type', filters.itemType);
  }

  if (filters.status) {
    params.append('status', filters.status);
  }

  return params.toString();
};

const inventoryUrl = ref(`/api/oscal/inventory?${buildQueryParams()}`);

const {
  data: inventoryItems,
  isLoading: inventoryItemsLoading,
  execute: loadInventoryItems,
} = useDataApi<InventoryItemWithSource[]>(inventoryUrl, null, {
  immediate: false,
});

// Calculate source statistics
const sourceStats = computed(() => {
  const stats = { ssp: 0, evidence: 0, poam: 0, ap: 0, ar: 0 };
  (inventoryItems.value || []).forEach((item) => {
    switch (item.sourceType) {
      case 'ssp':
        stats.ssp++;
        break;
      case 'evidence':
        stats.evidence++;
        break;
      case 'poam':
        stats.poam++;
        break;
      case 'assessment-plan':
        stats.ap++;
        break;
      case 'assessment-results':
        stats.ar++;
        break;
      case 'ap':
        stats.ap++;
        break;
      case 'ar':
        stats.ar++;
        break;
    }
  });
  return stats;
});

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

// Watch filters and reload when they change
watch(
  () => buildQueryParams(),
  async (newParams) => {
    const newUrl = `/api/oscal/inventory?${newParams}`;
    console.log('Filter changed, new URL:', newUrl);
    inventoryUrl.value = newUrl;
    try {
      // Pass the new URL directly to execute
      await loadInventoryItems(newUrl);
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
  },
);

onMounted(async () => {
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

const editingInventoryItem = ref<InventoryItemWithSource | null>(null);
const showCreateInventoryItemModal = ref(false);
const showEditInventoryItemModal = ref(false);
const showInventoryItemAttachModal = ref(false);

const { firstOfProps } = useProps();

// Get severity color for source badge
const getSourceSeverity = (sourceType: string) => {
  switch (sourceType) {
    case 'ssp':
      return 'info';
    case 'evidence':
      return 'success';
    case 'poam':
      return 'warning';
    case 'assessment-plan':
    case 'ap':
      return 'contrast';
    case 'assessment-results':
    case 'ar':
      return 'danger';
    default:
      return 'secondary';
  }
};

// Inventory Item management
const editInventoryItem = (item: InventoryItemWithSource) => {
  editingInventoryItem.value = item;
  showEditInventoryItemModal.value = true;
};

const handleInventoryItemCreated = async (newItem: InventoryItem) => {
  showCreateInventoryItemModal.value = false;
  // Reload items to show the new one
  await loadInventoryItems();
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Inventory item created successfully.',
    life: 3000,
  });
};

const handleInventoryItemSaved = async (updatedItem: InventoryItem) => {
  showEditInventoryItemModal.value = false;
  editingInventoryItem.value = null;
  // Reload items to show the updated one
  await loadInventoryItems();
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Inventory item updated successfully.',
    life: 3000,
  });
};

const handleInventoryItemAttached = async (updatedItem: InventoryItem) => {
  showInventoryItemAttachModal.value = false;
  editingInventoryItem.value = null;
  // Reload items to show the updated attachment
  await loadInventoryItems();
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Inventory item attached to SSP successfully.',
    life: 3000,
  });
};

function attachInventoryItem(item: InventoryItemWithSource) {
  editingInventoryItem.value = item;
  showInventoryItemAttachModal.value = true;
}

async function attachToSSP(item: InventoryItemWithSource) {
  // This would add a non-SSP inventory item to the SSP
  // For now, show a message that this needs to be implemented
  toast.add({
    severity: 'info',
    summary: 'Feature Coming Soon',
    detail: 'Adding external inventory items to SSP will be implemented soon.',
    life: 3000,
  });
}

const deleteInventoryItem = async (item: InventoryItemWithSource) => {
  if (!sspId.value || item.sourceType !== 'ssp') {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Can only delete items attached to the current SSP.',
      life: 5000,
    });
    return;
  }

  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${sspId.value}/system-implementation/inventory-items/${item.uuid}`,
    );
    // Reload items after deletion
    await loadInventoryItems();
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

const downloadInventoryItemJSON = (item: InventoryItemWithSource) => {
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
