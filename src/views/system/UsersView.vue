<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">System Users</h3>
      <PrimaryButton
        @click="showCreateUserModal = true"
      >
        Create User
      </PrimaryButton>
    </div>

    <div class="space-y-4">
      <div
        v-if="users?.length === 0"
        class="text-center py-8 text-gray-500 dark:text-slate-400"
      >
        No users defined. Create your first user to get started.
      </div>

      <Panel v-for="user in users" :key="user.uuid" collapsed toggleable>
        <template #header>
          <div class="flex items-center gap-2 py-2">
            <span class="font-medium">{{ user.title }}</span>
            <span
              v-if="user.shortName"
              class="text-sm text-gray-500 dark:text-slate-400"
              >({{ user.shortName }})</span
            >
          </div>
        </template>
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
            <TertiaryButton
              @click.stop="editUser(user)"
            >
              Edit
            </TertiaryButton>
            <TertiaryButton
              @click.stop="downloadUserJSON(user)"
            >
              JSON
            </TertiaryButton>
            <TertiaryButton
              @click.stop="
                confirmDeleteDialog(() => deleteUser(user), {
                  itemName: user.title,
                  itemType: 'user',
                })
              "
            >
              Delete
            </TertiaryButton>
          </div>
        </div>
        <div
          class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
        >
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
            {{ user.description }}
          </p>

          <div v-if="user.roleIds?.length" class="mb-3">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
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
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
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
      </Panel>
    </div>
  </div>

  <!-- User Create Modal -->
  <Dialog
    v-model:visible="showCreateUserModal"
    modal
    header="Create User"
    class="custom-colors"
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
    class="custom-colors"
  >
    <SystemImplementationUserEditForm
      v-if="editingUser"
      :ssp-id="sspId"
      :user="editingUser!"
      @cancel="showEditUserModal = false"
      @saved="handleUserSaved"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';

// Form components
import Panel from '@/volt/Panel.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';

// Types and stores
import type { SystemUser, SystemSecurityPlan } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const toast = useToast();
const { system } = useSystemStore();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

// Data
const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const sspId = computed(() => systemSecurityPlan.value?.uuid ?? '');

// Modal states
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);

const { data: users, execute: fetchUsers } = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/users`,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeDelete } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

// Edit targets
const editingUser = ref<SystemUser | null>(null);

const loadData = async () => {
  systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

  await fetchUsers();
};

onMounted(async () => {
  await loadData();
});

// User management
const editUser = (user: SystemUser) => {
  editingUser.value = user;
  showEditUserModal.value = true;
};

const handleUserCreated = (newUser: SystemUser) => {
  users.value?.push(newUser);
  showCreateUserModal.value = false;
};

const handleUserSaved = (updatedUser: SystemUser) => {
  if (users.value) {
    const index = users.value.findIndex((u) => u.uuid === updatedUser.uuid);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemUser) => {
  const dataStr = JSON.stringify(decamelizeKeys(user), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-${user.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteUser = async (user: SystemUser) => {
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/users/${user.uuid}`,
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
};
</script>

<style>
.custom-colors .p-dialog-content {
  background-color: white; /* light mode */
  color: #1f2937; /* slate-800 text */
}

.custom-colors .p-dialog-header {
  background-color: #f3f4f6; /* light gray header */
  color: #111827; /* dark header text */
}

.custom-colors .p-dialog-mask {
  background-color: rgba(0, 85, 255, 0.7); /* semi-transparent gray */
}

/* Dark mode */
.dark .custom-colors .p-dialog-content {
  background-color: #1f2937; /* slate-900 */
  color: #e5e7eb; /* slate-200 text */
}

.dark .custom-colors .p-dialog-header {
  background-color: #111827;
  color: #e5e7eb;
}

.dark .custom-colors .p-dialog-mask {
  background-color: rgba(30, 41, 59, 0.95);
}
</style>
