<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <TooltipTitle
        text="System Users"
        tooltip-key="system.users"
        underline-class="text-lg font-semibold text-gray-900 dark:text-slate-300 underline decoration-dotted cursor-help"
      />
      <PrimaryButton
        @click="showCreateUserModal = true"
        :disabled="!can(RESOURCES.SSP, ACTIONS.CREATE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.SSP, ACTIONS.CREATE),
          disabled: can(RESOURCES.SSP, ACTIONS.CREATE),
        }"
      >
        <i class="pi pi-plus mr-2"></i>
        Create User
      </PrimaryButton>
    </div>

    <div class="space-y-4">
      <div
        v-if="!users?.length"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No users defined. Create your first user to get started.
      </div>

      <div
        v-for="user in users"
        :key="user.uuid"
        class="border border-gray-200 dark:border-slate-700 rounded-lg"
      >
        <CollapsableGroup>
          <template #header>
            <div class="py-3 px-4 flex justify-between items-center">
              <div class="flex items-center space-x-3">
                <span class="font-medium text-gray-900 dark:text-slate-300">{{
                  user.title
                }}</span>
                <span
                  v-if="user.shortName"
                  class="text-sm text-gray-500 dark:text-slate-400"
                  >({{ user.shortName }})</span
                >
              </div>
              <div class="flex gap-2">
                <SecondaryButton
                  @click.stop="editUser(user)"
                  :disabled="!can(RESOURCES.SSP, ACTIONS.UPDATE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
                    disabled: can(RESOURCES.SSP, ACTIONS.UPDATE),
                  }"
                >
                  Edit
                </SecondaryButton>
                <SecondaryButton @click.stop="downloadUserJSON(user)">
                  JSON
                </SecondaryButton>
                <TertiaryButton
                  :disabled="!can(RESOURCES.SSP, ACTIONS.DELETE)"
                  v-tooltip.top="{
                    value: permissionTooltip(RESOURCES.SSP, ACTIONS.DELETE),
                    disabled: can(RESOURCES.SSP, ACTIONS.DELETE),
                  }"
                  @click.stop="
                    confirmDeleteDialog(() => deleteUser(user), {
                      itemName: user.title,
                      itemType: 'user',
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
            <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
              {{ user.description }}
            </p>

            <div v-if="user.roleIds?.length" class="mb-3">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
                >Roles:</span
              >
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="role in user.roleIds"
                  :key="role"
                  class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                >
                  {{ role }}
                </span>
              </div>
            </div>

            <div v-if="user.authorizedPrivileges?.length" class="space-y-2">
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300"
                >Authorized Privileges:</span
              >
              <div
                v-for="privilege in user.authorizedPrivileges"
                :key="privilege.title"
                class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
              >
                <div class="font-medium text-sm">{{ privilege.title }}</div>
                <div
                  v-if="privilege.description"
                  class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                >
                  {{ privilege.description }}
                </div>
                <div
                  v-if="privilege.functionsPerformed?.length"
                  class="text-xs text-blue-600 dark:text-blue-400 mt-1"
                >
                  Functions: {{ privilege.functionsPerformed.join(', ') }}
                </div>
              </div>
            </div>
          </div>
        </CollapsableGroup>
      </div>
    </div>

    <!-- User Create Modal -->
    <Dialog
      v-model:visible="showCreateUserModal"
      modal
      header="Create User"
      :draggable="false"
      class="w-full max-w-2xl"
    >
      <SystemImplementationUserCreateForm
        :ssp-id="sspId"
        @cancel="showCreateUserModal = false"
        @created="handleUserCreated"
      />
    </Dialog>

    <!-- User Edit Modal -->
    <Dialog
      v-model:visible="showEditUserModal"
      modal
      header="Edit User"
      :draggable="false"
      class="w-full max-w-2xl"
    >
      <SystemImplementationUserEditForm
        v-if="editingUser"
        :ssp-id="sspId"
        :user="editingUser!"
        @cancel="showEditUserModal = false"
        @saved="handleUserSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { downloadJson } from '@/utils/download-json';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';
import type { SystemUser } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const props = defineProps<{ sspId: string }>();
const emit = defineEmits<{ count: [number] }>();

const { can, permissionTooltip } = usePermissions();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const { data: users } = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users`,
);
watch(users, (val) => emit('count', val?.length || 0), { immediate: true });

const { execute: executeDeleteUser } = useDataApi<void>(null, {
  method: 'DELETE',
});

const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const editingUser = ref<SystemUser | null>(null);

function editUser(user: SystemUser) {
  editingUser.value = user;
  showEditUserModal.value = true;
}

function handleUserCreated(newUser: SystemUser) {
  users.value = [...(users.value ?? []), newUser];
  showCreateUserModal.value = false;
}

function handleUserSaved(updatedUser: SystemUser) {
  if (users.value) {
    users.value = users.value.map((user) =>
      user.uuid === updatedUser.uuid ? updatedUser : user,
    );
  }
  showEditUserModal.value = false;
  editingUser.value = null;
}

function downloadUserJSON(user: SystemUser) {
  downloadJson(`user-${user.uuid}.json`, user);
}

async function deleteUser(user: SystemUser) {
  try {
    await executeDeleteUser(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users/${user.uuid}`,
    );
    if (users.value) {
      users.value = users.value.filter((u) => u.uuid !== user.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete user. Please try again.',
      life: 5000,
    });
  }
}
</script>
