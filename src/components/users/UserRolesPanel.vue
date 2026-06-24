<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold dark:text-slate-200">Roles</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          System roles held directly or inherited from group membership.
        </p>
      </div>
      <PermissionGate
        :resource="RESOURCES.ROLE_ASSIGNMENT"
        :action="ACTIONS.CREATE"
      >
        <PrimaryButton
          size="small"
          :disabled="!availableRoles.length"
          @click="openAssignDialog"
        >
          <i class="pi pi-user-plus mr-2"></i>
          Assign Role
        </PrimaryButton>
      </PermissionGate>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
      <p class="mt-3 text-gray-500 dark:text-slate-400">Loading roles...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="rolesError" class="text-center py-10">
      <i class="pi pi-exclamation-triangle text-4xl text-red-400"></i>
      <p class="mt-3 text-red-500">Error loading roles.</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!roles?.length" class="text-center py-10">
      <i class="pi pi-id-card text-5xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-3 text-gray-500 dark:text-slate-400">No roles yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-1">
        This user holds no system roles directly or through a group.
      </p>
    </div>

    <!-- Roles Table -->
    <div
      v-else
      class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <table class="table-auto w-full dark:text-slate-300">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr class="border-b border-ccf-300 dark:border-slate-700">
            <th class="table-header">Role</th>
            <th class="table-header">Origin</th>
            <th class="table-header">Source</th>
            <th class="table-header text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="role in roles"
            :key="`${role.roleName}-${role.viaGroup ?? 'direct'}-${role.assignmentId}`"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800 last:border-b-0"
          >
            <td
              class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
            >
              {{ role.roleName }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              <Badge v-if="!role.inherited" severity="secondary">Direct</Badge>
              <Badge
                v-else
                severity="info"
                v-tooltip.top="
                  'Inherited from a group — manage it on the group'
                "
              >
                Inherited via {{ role.viaGroup || 'group' }}
              </Badge>
            </td>
            <td class="px-6 py-4">
              <Badge
                v-if="role.source === 'config'"
                severity="warn"
                v-tooltip.top="
                  'Defined in configuration — cannot be removed here'
                "
              >
                Config-locked
              </Badge>
              <Badge v-else severity="secondary">Manual</Badge>
            </td>
            <td class="px-6 py-4 text-right">
              <PermissionGate
                v-if="isRemovable(role)"
                :resource="RESOURCES.ROLE_ASSIGNMENT"
                :action="ACTIONS.DELETE"
              >
                <SecondaryButton
                  size="small"
                  severity="danger"
                  @click="removeRole(role)"
                >
                  Remove
                </SecondaryButton>
              </PermissionGate>
              <span
                v-else
                class="text-gray-400 dark:text-slate-600 text-sm"
                v-tooltip.top="removeBlockedReason(role)"
              >
                —
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog
      modal
      header="Assign Role"
      :draggable="false"
      v-model:visible="showAssignDialog"
    >
      <form @submit.prevent="assignRole" class="pt-1 w-full sm:w-96 space-y-4">
        <div>
          <Label for="assign-role">Role</Label>
          <Select
            id="assign-role"
            v-model="selectedRole"
            :options="availableRoles"
            option-label="name"
            option-value="name"
            placeholder="Select a role"
            class="w-full"
          >
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-slate-100">
                  {{ option.name }}
                </span>
                <span class="text-sm text-gray-500 dark:text-slate-400">
                  {{ option.description }}
                </span>
              </div>
            </template>
          </Select>
        </div>

        <Message v-if="assignError" severity="error">{{ assignError }}</Message>

        <div
          class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700"
        >
          <SecondaryButton type="button" @click="showAssignDialog = false">
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" :disabled="!selectedRole || assigning">
            <i v-if="assigning" class="pi pi-spin pi-spinner mr-2"></i>
            Assign
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EffectiveRole, ErrorBody, ErrorResponse } from '@/stores/types';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import Select from '@/volt/Select.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import { RESOURCES, ACTIONS, MANIFEST_ROLES } from '@/constants/permissions';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Tooltip from 'primevue/tooltip';

defineOptions({ directives: { tooltip: Tooltip } });

const props = defineProps<{ userId: string; userEmail: string }>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

const showAssignDialog = ref(false);
const selectedRole = ref<string | null>(null);
const assigning = ref(false);
const assignError = ref('');

const {
  data: roles,
  isLoading,
  error: rolesError,
  execute: fetchRoles,
} = useDataApi<EffectiveRole[]>(
  `/api/admin/users/${props.userId}/roles`,
  {},
  { immediate: false },
);

// Roles already granted directly to the user — exclude them from the picker so a redundant
// grant doesn't 409. A role held only via a group can still be granted directly (a distinct,
// stronger grant), so inherited-only roles stay assignable.
const directRoleNames = computed(
  () =>
    new Set(
      (roles.value ?? []).filter((r) => !r.inherited).map((r) => r.roleName),
    ),
);

const availableRoles = computed(() =>
  MANIFEST_ROLES.filter((r) => !directRoleNames.value.has(r.name)),
);

// Only a direct, manual grant can be removed here. Config grants are immutable, and inherited
// grants must be managed on the granting group.
function isRemovable(role: EffectiveRole): boolean {
  return !role.inherited && role.source === 'manual';
}

function removeBlockedReason(role: EffectiveRole): string {
  if (role.inherited)
    return 'Inherited from a group — remove it on the group instead';
  return 'Defined in configuration — cannot be removed here';
}

function openAssignDialog() {
  selectedRole.value = null;
  assignError.value = '';
  showAssignDialog.value = true;
}

async function assignRole() {
  if (!selectedRole.value) return;
  assigning.value = true;
  assignError.value = '';
  try {
    await axiosInstance.post('/api/admin/role-assignments', {
      roleName: selectedRole.value,
      assigneeType: 'user',
      assigneeId: props.userEmail,
    });
    await fetchRoles();
    showAssignDialog.value = false;
    toast.add({ severity: 'success', summary: 'Role assigned', life: 2000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    assignError.value =
      errorResponse.response?.data.errors.body ?? 'Failed to assign role.';
  } finally {
    assigning.value = false;
  }
}

async function removeRole(role: EffectiveRole) {
  try {
    await axiosInstance.delete(
      `/api/admin/role-assignments/${role.assignmentId}`,
    );
    await fetchRoles();
    toast.add({ severity: 'success', summary: 'Role removed', life: 2000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error removing role',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
  }
}

fetchRoles();
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}
</style>
