<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">System Users</h3>
      <button
        @click="showCreateUserModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Create User
      </button>
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
            <button
              @click.stop="editUser(user)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
            <button
              @click.stop="downloadUserJSON(user)"
              class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              JSON
            </button>
            <button
              @click.stop="deleteUser(user)"
              class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
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
  <Dialog v-model:visible="showCreateUserModal" modal header="Create User">
    <SystemImplementationUserCreateForm
      :ssp-id="sspId"
      @cancel="showCreateUserModal = false"
      @created="handleUserCreated"
    />
  </Dialog>

  <!-- User Edit Modal -->
  <Dialog v-model:visible="showEditUserModal" modal header="Edit User">
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
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';
import Dialog from '@/volt/Dialog.vue';

// Form components
import Panel from '@/volt/Panel.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';

// Types and stores
import {
  type SystemImplementationUser,
  type SystemSecurityPlan,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import type { DataResponse } from '@/stores/types.ts';
import { useSystemStore } from '@/stores/system.ts';

const route = useRoute();
const toast = useToast();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();
const { system } = useSystemStore();

// Data
const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const sspId = computed(() => systemSecurityPlan.value?.uuid ?? '');
const users = ref<SystemImplementationUser[] | null>(null);

// Modal states
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);

// Edit targets
const editingUser = ref<SystemImplementationUser | null>(null);

const loadData = () => {
  systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

  sspStore
    .getSystemImplementationUsers(system.securityPlan?.uuid as string)
    .then((data: DataResponse<SystemImplementationUser[]>) => {
      users.value = data.data;
    });
};

onMounted(() => {
  loadData();
});

// User management
const editUser = (user: SystemImplementationUser) => {
  editingUser.value = user;
  showEditUserModal.value = true;
};

const handleUserCreated = (newUser: SystemImplementationUser) => {
  users.value?.push(newUser);
  showCreateUserModal.value = false;
};

const handleUserSaved = (updatedUser: SystemImplementationUser) => {
  if (users.value) {
    const index = users.value.findIndex((u) => u.uuid === updatedUser.uuid);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemImplementationUser) => {
  const dataStr = JSON.stringify(decamelizeKeys(user), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-${user.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteUser = async (user: SystemImplementationUser) => {
  if (!confirm(`Are you sure you want to delete user "${user.title}"?`)) {
    return;
  }

  try {
    await sspStore.deleteSystemImplementationUser(
      systemSecurityPlan.value?.uuid as string,
      user.uuid,
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
