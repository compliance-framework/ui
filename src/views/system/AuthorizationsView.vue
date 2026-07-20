<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <TooltipTitle
        text="Leveraged Authorizations"
        tooltip-key="system.authorizations"
        position="bottom"
        underline-class="text-lg font-semibold dark:text-slate-300 underline decoration-dotted cursor-help"
      />
      <div class="flex items-center gap-4">
        <!-- Subscribing to an export offering is what creates most of these records, so give
             the reader the way back to what was inherited. A per-authorization link to its
             offering isn't possible yet: the leveraged-controls projection doesn't carry
             leveragedAuthUuid, so there is no id to join on. -->
        <RouterLink
          v-if="sspId"
          :to="{
            name: 'system-security-plan-inherited-capabilities',
            params: { id: sspId },
          }"
          class="text-sm font-medium underline text-blue-600 dark:text-blue-300"
        >
          Inherited capabilities
        </RouterLink>
        <PrimaryButton @click="showCreateLeveragedAuthModal = true">
          Create Authorization
        </PrimaryButton>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-if="showEmptyAuthorizations"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No leveraged authorizations defined. Create your first authorization to
        get started.
      </div>

      <Panel
        v-for="auth in leveragedAuthorizations"
        :key="auth.uuid"
        collapsed
        toggleable
      >
        <template #header>
          <div class="flex items-center gap-2 py-2">
            <span class="font-medium text-gray-900 dark:text-slate-300">{{
              auth.title
            }}</span>
            <span
              class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
            >
              {{ new Date(auth.dateAuthorized).toLocaleDateString() }}
            </span>
          </div>
        </template>
        <div>
          <div class="py-3 px-4 flex justify-between items-center">
            <div class="flex items-center space-x-3"></div>
            <div class="flex gap-2">
              <TertiaryButton @click.stop="editLeveragedAuth(auth)">
                Edit
              </TertiaryButton>
              <TertiaryButton @click.stop="downloadLeveragedAuthJSON(auth)">
                JSON
              </TertiaryButton>
              <TertiaryButton
                @click.stop="
                  confirmDeleteDialog(() => deleteLeveragedAuth(auth), {
                    itemName: auth.title,
                    itemType: 'leveraged authorization',
                  })
                "
              >
                Delete
              </TertiaryButton>
            </div>
          </div>
        </div>
        <div
          class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
                >Party UUID:</span
              >
              <span
                class="text-sm text-gray-600 dark:text-slate-400 ml-2 font-mono"
                >{{ auth.partyUuid }}</span
              >
            </div>
            <div>
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
                >Date Authorized:</span
              >
              <span class="text-sm text-gray-600 dark:text-slate-400 ml-2">{{
                new Date(auth.dateAuthorized).toLocaleDateString()
              }}</span>
            </div>
          </div>

          <div v-if="auth.remarks" class="mb-3">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >Remarks:</span
            >
            <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
              {{ auth.remarks }}
            </p>
          </div>

          <div v-if="auth.props?.length" class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >Properties:</span
            >
            <div
              v-for="prop in auth.props"
              :key="prop.name"
              class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
            >
              <div class="font-medium text-sm">{{ prop.name }}</div>
              <div class="text-xs text-gray-600 dark:text-slate-400 mt-1">
                {{ prop.value }}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  </div>

  <!-- Leveraged Authorization Create Modal -->
  <Dialog
    v-model:visible="showCreateLeveragedAuthModal"
    modal
    header="Create Leveraged Authorization"
  >
    <SystemImplementationLeveragedAuthorizationCreateForm
      :ssp-id="sspId"
      @cancel="showCreateLeveragedAuthModal = false"
      @created="handleLeveragedAuthCreated"
    />
  </Dialog>

  <!-- Leveraged Authorization Edit Modal -->
  <Dialog
    v-model:visible="showEditLeveragedAuthModal"
    modal
    header="Edit Leveraged Authorization"
  >
    <SystemImplementationLeveragedAuthorizationEditForm
      v-if="editingLeveragedAuth"
      :ssp-id="sspId"
      :auth="editingLeveragedAuth!"
      @cancel="showEditLeveragedAuthModal = false"
      @saved="handleLeveragedAuthSaved"
    />
  </Dialog>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';

// Form components
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';

// Types and stores
import type { SystemSecurityPlan, LeveragedAuthorization } from '@/oscal';
import Panel from '@/volt/Panel.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const toast = useToast();
const { system } = useSystemStore();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

// Data
const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const sspId = computed(() => systemSecurityPlan.value?.uuid ?? '');

const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);

const {
  data: leveragedAuthorizations,
  isLoading: leveragedAuthorizationsLoading,
  execute: fetchLeveragedAuthorizations,
} = useDataApi<LeveragedAuthorization[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/leveraged-authorizations`,
  { method: 'GET' },
  { immediate: false },
);

const leveragedAuthorizationsLoadFailed = ref(false);

const showEmptyAuthorizations = computed(() => {
  return (
    !leveragedAuthorizationsLoadFailed.value &&
    !leveragedAuthorizationsLoading.value &&
    (leveragedAuthorizations.value?.length ?? 0) === 0
  );
});

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

// Edit targets
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

const loadData = async () => {
  systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;
  leveragedAuthorizationsLoadFailed.value = false;
  try {
    await fetchLeveragedAuthorizations();
  } catch (error) {
    leveragedAuthorizationsLoadFailed.value = true;
    leveragedAuthorizations.value = [];
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to load leveraged authorizations. ${toErrorDetail(error)}`,
      life: 5000,
    });
  }
};

onMounted(async () => {
  await loadData();
});

// Leveraged Authorization management
const editLeveragedAuth = (auth: LeveragedAuthorization) => {
  editingLeveragedAuth.value = auth;
  showEditLeveragedAuthModal.value = true;
};

const handleLeveragedAuthCreated = (newAuth: LeveragedAuthorization) => {
  leveragedAuthorizations.value = [
    ...(leveragedAuthorizations.value ?? []),
    newAuth,
  ];
  showCreateLeveragedAuthModal.value = false;
};

const handleLeveragedAuthSaved = (updatedAuth: LeveragedAuthorization) => {
  if (leveragedAuthorizations.value) {
    const index = leveragedAuthorizations.value.findIndex(
      (a) => a.uuid === updatedAuth.uuid,
    );
    if (index !== -1) {
      leveragedAuthorizations.value[index] = updatedAuth;
    }
  }
  showEditLeveragedAuthModal.value = false;
  editingLeveragedAuth.value = null;
};

const downloadLeveragedAuthJSON = (auth: LeveragedAuthorization) => {
  const dataStr = JSON.stringify(decamelizeKeys(auth), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leveraged-auth-${auth.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

function toErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  return 'Please try again.';
}

const deleteLeveragedAuth = async (auth: LeveragedAuthorization) => {
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/leveraged-authorizations/${auth.uuid}`,
    );
    if (leveragedAuthorizations.value) {
      leveragedAuthorizations.value = leveragedAuthorizations.value.filter(
        (a) => a.uuid !== auth.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leveraged authorization deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete leveraged authorization:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete leveraged authorization. Please try again.',
      life: 5000,
    });
  }
};
</script>
