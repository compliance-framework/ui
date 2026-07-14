<template>
  <div class="space-y-6">
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Export Offerings
        </h3>
        <PermissionGate
          :resource="RESOURCES.SSP_EXPORT_OFFERING"
          :action="ACTIONS.CREATE"
        >
          <PrimaryButton @click="showCreateModal = true">
            Create Offering
          </PrimaryButton>
        </PermissionGate>
      </div>

      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">
          Loading export offerings...
        </p>
      </div>

      <div v-else-if="!offerings?.length" class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          No export offerings yet. Click "Create Offering" to get started.
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="offering in offerings"
          :key="offering.id"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-medium text-gray-900 dark:text-slate-300">
                  {{ offering.title }}
                </h4>
                <Badge :severity="statusSeverity(offering.status)">
                  {{ offering.status }}
                </Badge>
                <span class="text-xs text-gray-500 dark:text-slate-400">
                  v{{ offering.version }}
                </span>
              </div>
              <p
                v-if="offering.description"
                class="text-sm text-gray-600 dark:text-slate-400 mt-1"
              >
                {{ offering.description }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {{
                  offering.publishedAt
                    ? `Published ${formatDate(offering.publishedAt)}`
                    : 'Not yet published'
                }}
              </p>
            </div>
            <div class="flex gap-3 shrink-0 ml-4">
              <PermissionGate
                :resource="RESOURCES.SSP_EXPORT_OFFERING"
                :action="ACTIONS.UPDATE"
              >
                <button
                  type="button"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                  @click="openEditModal(offering)"
                >
                  Edit
                </button>
              </PermissionGate>
              <button
                type="button"
                class="text-gray-600 hover:text-gray-800 dark:text-slate-400 text-sm"
                @click="openItemsModal(offering)"
              >
                Manage Items ({{ offering.items?.length ?? 0 }})
              </button>
              <PermissionGate
                :resource="RESOURCES.SSP"
                :action="ACTIONS.EXPORT"
              >
                <button
                  type="button"
                  class="text-gray-600 hover:text-gray-800 dark:text-slate-400 text-sm"
                  @click="openAllowlistModal(offering)"
                >
                  Allowed Downstreams
                </button>
                <button
                  v-if="
                    offering.status === 'draft' ||
                    offering.status === 'published'
                  "
                  type="button"
                  class="text-green-600 hover:text-green-800 dark:text-green-400 text-sm"
                  :disabled="publishingIds.has(offering.id)"
                  @click="publish(offering)"
                >
                  {{ offering.status === 'draft' ? 'Publish' : 'Republish' }}
                </button>
                <button
                  v-if="offering.status === 'published'"
                  type="button"
                  class="text-orange-600 hover:text-orange-800 dark:text-orange-400 text-sm"
                  @click="confirmStatusChange(offering, 'deprecated')"
                >
                  Deprecate
                </button>
                <button
                  v-if="offering.status === 'published'"
                  type="button"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                  @click="confirmStatusChange(offering, 'revoked')"
                >
                  Revoke
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showCreateModal"
      size="lg"
      modal
      header="Create Export Offering"
    >
      <ExportOfferingCreateForm
        :ssp-id="sspId"
        @cancel="showCreateModal = false"
        @created="handleCreated"
      />
    </Dialog>

    <Dialog
      v-model:visible="showEditModal"
      size="lg"
      modal
      header="Edit Export Offering"
    >
      <ExportOfferingEditForm
        v-if="editingOffering"
        :ssp-id="sspId"
        :offering="editingOffering"
        @cancel="showEditModal = false"
        @saved="handleSaved"
      />
    </Dialog>

    <Dialog
      v-model:visible="showItemsModal"
      size="xl"
      modal
      :header="`Manage Items — ${itemsOffering?.title ?? ''}`"
    >
      <ExportOfferingItemsDialog
        v-if="itemsOffering"
        :ssp-id="sspId"
        :offering="itemsOffering"
        :control-implementation="controlImplementation"
        :system-implementation="systemImplementation"
        @updated="handleItemsUpdated"
      />
    </Dialog>

    <Dialog
      v-model:visible="showAllowlistModal"
      size="lg"
      modal
      :header="`Allowed Downstreams — ${allowlistOffering?.title ?? ''}`"
    >
      <ExportOfferingAllowlistDialog
        v-if="allowlistOffering"
        :ssp-id="sspId"
        :offering-id="allowlistOffering.id"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Dialog from '@/volt/Dialog.vue';
import Badge from '@/volt/Badge.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import ExportOfferingCreateForm from '@/components/system-security-plans/ExportOfferingCreateForm.vue';
import ExportOfferingEditForm from '@/components/system-security-plans/ExportOfferingEditForm.vue';
import ExportOfferingItemsDialog from '@/components/system-security-plans/ExportOfferingItemsDialog.vue';
import ExportOfferingAllowlistDialog from '@/components/system-security-plans/ExportOfferingAllowlistDialog.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  SSPExportOffering,
  SSPExportOfferingItem,
  SSPExportOfferingStatus,
} from '@/types/ssp-export-offerings';
import type { AxiosError } from 'axios';

// The offerings surface itself, decoupled from where the sspId comes from: the SSP-editor
// route passes the route param, the System tab passes the selected SSP. Both render this one
// component — a second copy is how the two StatementByComponent partials drifted.
const props = defineProps<{
  sspId: string;
}>();

const toast = useToast();
const confirm = useConfirm();
const axiosInstance = useAuthenticatedInstance();

// Watched, not interpolated once: useDataApi resolves toValue(url) a single time and both
// hosts keep this component alive across SSP switches, so a plain string would keep showing
// the first SSP's offerings.
const offeringsUrl = computed(() =>
  props.sspId
    ? `/api/oscal/system-security-plans/${props.sspId}/export-offerings`
    : null,
);
const controlImplementationUrl = computed(() =>
  props.sspId
    ? `/api/oscal/system-security-plans/${props.sspId}/control-implementation`
    : null,
);
const systemImplementationUrl = computed(() =>
  props.sspId
    ? `/api/oscal/system-security-plans/${props.sspId}/system-implementation`
    : null,
);

const {
  data: offerings,
  isLoading: loading,
  execute: fetchOfferings,
} = useDataApi<SSPExportOffering[]>(null, {}, { immediate: false });
const { data: controlImplementation, execute: fetchControlImplementation } =
  useDataApi<ControlImplementation>(null, {}, { immediate: false });
const { data: systemImplementation, execute: fetchSystemImplementation } =
  useDataApi<SystemImplementation>(null, {}, { immediate: false });

watch(
  [offeringsUrl, controlImplementationUrl, systemImplementationUrl],
  async () => {
    if (!offeringsUrl.value) {
      offerings.value = undefined;
      controlImplementation.value = undefined;
      systemImplementation.value = undefined;
      return;
    }
    await Promise.all([
      fetchOfferings(offeringsUrl.value).catch(() => undefined),
      fetchControlImplementation(controlImplementationUrl.value!).catch(
        () => undefined,
      ),
      fetchSystemImplementation(systemImplementationUrl.value!).catch(
        () => undefined,
      ),
    ]);
  },
  { immediate: true },
);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showItemsModal = ref(false);
const showAllowlistModal = ref(false);
const editingOffering = ref<SSPExportOffering | null>(null);
const itemsOffering = ref<SSPExportOffering | null>(null);
const allowlistOffering = ref<SSPExportOffering | null>(null);
const publishingIds = reactive(new Set<string>());

function statusSeverity(status: SSPExportOfferingStatus) {
  switch (status) {
    case 'published':
      return 'success';
    case 'deprecated':
      return 'warn';
    case 'revoked':
      return 'danger';
    default:
      return 'secondary';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function replaceOffering(updated: SSPExportOffering) {
  if (!offerings.value) return;
  const index = offerings.value.findIndex((o) => o.id === updated.id);
  if (index !== -1) {
    offerings.value[index] = updated;
  }
}

function handleCreated(offering: SSPExportOffering) {
  if (offerings.value) {
    offerings.value.push(offering);
  }
  showCreateModal.value = false;
}

function openEditModal(offering: SSPExportOffering) {
  editingOffering.value = offering;
  showEditModal.value = true;
}

function handleSaved(offering: SSPExportOffering) {
  replaceOffering(offering);
  showEditModal.value = false;
  editingOffering.value = null;
}

function openItemsModal(offering: SSPExportOffering) {
  itemsOffering.value = offering;
  showItemsModal.value = true;
}

function openAllowlistModal(offering: SSPExportOffering) {
  allowlistOffering.value = offering;
  showAllowlistModal.value = true;
}

function handleItemsUpdated(items: SSPExportOfferingItem[]) {
  if (itemsOffering.value) {
    itemsOffering.value = { ...itemsOffering.value, items };
    replaceOffering(itemsOffering.value);
  }
}

async function publish(offering: SSPExportOffering) {
  if (publishingIds.has(offering.id)) return;
  publishingIds.add(offering.id);
  try {
    const response = await axiosInstance.post<DataResponse<SSPExportOffering>>(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${offering.id}/publish`,
    );
    replaceOffering(response.data.data);
    toast.add({
      severity: 'success',
      summary: 'Export offering published.',
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body ||
        'Failed to publish export offering.',
      life: 5000,
    });
  } finally {
    publishingIds.delete(offering.id);
  }
}

function confirmStatusChange(
  offering: SSPExportOffering,
  status: 'deprecated' | 'revoked',
) {
  const verb = status === 'deprecated' ? 'deprecate' : 'revoke';
  confirm.require({
    message: `Are you sure you want to ${verb} "${offering.title}"? This action cannot be undone.`,
    header:
      status === 'deprecated' ? 'Confirm Deprecation' : 'Confirm Revocation',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Confirm' },
    accept: async () => {
      await updateStatus(offering, status);
    },
  });
}

async function updateStatus(
  offering: SSPExportOffering,
  status: 'deprecated' | 'revoked',
) {
  try {
    const response = await axiosInstance.patch<DataResponse<SSPExportOffering>>(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${offering.id}/status`,
      { status },
    );
    replaceOffering(response.data.data);
    toast.add({
      severity: 'success',
      summary: `Export offering ${status}.`,
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body ||
        `Failed to ${status === 'deprecated' ? 'deprecate' : 'revoke'} export offering.`,
      life: 5000,
    });
  }
}
</script>
