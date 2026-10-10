<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <TooltipTitle
        text="Leveraged Authorizations"
        tooltip-key="system.authorizations"
        underline-class="text-lg font-semibold text-gray-900 dark:text-slate-300 underline decoration-dotted cursor-help"
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
        <PrimaryButton
          @click="showCreateLeveragedAuthModal = true"
          :disabled="!can(RESOURCES.SSP, ACTIONS.CREATE)"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.SSP, ACTIONS.CREATE),
            disabled: can(RESOURCES.SSP, ACTIONS.CREATE),
          }"
        >
          <i class="pi pi-plus mr-2"></i>
          Create Authorization
        </PrimaryButton>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-if="!leveragedAuthorizations?.length"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No leveraged authorizations defined. Create your first authorization to
        get started.
      </div>

      <div
        v-for="auth in leveragedAuthorizations"
        :key="auth.uuid"
        class="border border-gray-200 dark:border-slate-700 rounded-lg"
      >
        <CollapsableGroup>
          <template #header>
            <div class="py-3 px-4 flex justify-between items-center">
              <div class="flex items-center space-x-3">
                <span class="font-medium text-gray-900 dark:text-slate-300">{{
                  auth.title
                }}</span>
                <span
                  class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
                >
                  {{ new Date(auth.dateAuthorized).toLocaleDateString() }}
                </span>
              </div>
              <div class="flex gap-2">
                <SecondaryButton
                  @click.stop="editLeveragedAuth(auth)"
                  :disabled="!can(RESOURCES.SSP, ACTIONS.UPDATE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
                    disabled: can(RESOURCES.SSP, ACTIONS.UPDATE),
                  }"
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton @click.stop="downloadLeveragedAuthJSON(auth)">
                  JSON
                </SecondaryButton>
                <TertiaryButton
                  :disabled="!can(RESOURCES.SSP, ACTIONS.DELETE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.SSP, ACTIONS.DELETE),
                    disabled: can(RESOURCES.SSP, ACTIONS.DELETE),
                  }"
                  @click.stop="
                    confirmDeleteDialog(() => deleteLeveragedAuth(auth), {
                      itemName: auth.title,
                      itemType: 'leveraged authorization',
                    })
                  "
                  class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  Delete
                </TertiaryButton>
              </div>
            </div>
          </template>
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
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
                >Remarks:</span
              >
              <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {{ auth.remarks }}
              </p>
            </div>

            <div v-if="auth.props?.length" class="space-y-2">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
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
        </CollapsableGroup>
      </div>
    </div>

    <!-- Leveraged Authorization Create Modal -->
    <Dialog
      v-model:visible="showCreateLeveragedAuthModal"
      modal
      header="Create Leveraged Authorization"
      :draggable="false"
      class="w-full max-w-2xl"
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
      :draggable="false"
      class="w-full max-w-2xl"
    >
      <SystemImplementationLeveragedAuthorizationEditForm
        v-if="editingLeveragedAuth"
        :ssp-id="sspId"
        :auth="editingLeveragedAuth!"
        @cancel="showEditLeveragedAuthModal = false"
        @saved="handleLeveragedAuthSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { downloadJson } from '@/utils/download-json';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';
import type { LeveragedAuthorization } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const props = defineProps<{ sspId: string }>();
const emit = defineEmits<{ count: [number] }>();

const { can, permissionTooltip } = usePermissions();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const { data: leveragedAuthorizations } = useDataApi<LeveragedAuthorization[]>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/leveraged-authorizations`,
);
watch(leveragedAuthorizations, (val) => emit('count', val?.length || 0), {
  immediate: true,
});

const { execute: executeDeleteLeveragedAuth } = useDataApi<void>(null, {
  method: 'DELETE',
});

const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

function editLeveragedAuth(auth: LeveragedAuthorization) {
  editingLeveragedAuth.value = auth;
  showEditLeveragedAuthModal.value = true;
}

function handleLeveragedAuthCreated(newAuth: LeveragedAuthorization) {
  leveragedAuthorizations.value = [
    ...(leveragedAuthorizations.value ?? []),
    newAuth,
  ];
  showCreateLeveragedAuthModal.value = false;
}

function handleLeveragedAuthSaved(updatedAuth: LeveragedAuthorization) {
  if (leveragedAuthorizations.value) {
    leveragedAuthorizations.value = leveragedAuthorizations.value.map((auth) =>
      auth.uuid === updatedAuth.uuid ? updatedAuth : auth,
    );
  }
  showEditLeveragedAuthModal.value = false;
  editingLeveragedAuth.value = null;
}

function downloadLeveragedAuthJSON(auth: LeveragedAuthorization) {
  downloadJson(`leveraged-auth-${auth.uuid}.json`, auth);
}

async function deleteLeveragedAuth(auth: LeveragedAuthorization) {
  try {
    await executeDeleteLeveragedAuth(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/leveraged-authorizations/${auth.uuid}`,
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
}
</script>
