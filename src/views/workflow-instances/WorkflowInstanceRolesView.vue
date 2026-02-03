<template>
  <div v-if="store.instance" class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Role Assignments
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Assign users to workflow roles for notifications and task ownership
        </p>
      </div>
      <PrimaryButton @click="openAssignDialog">
        <i class="pi pi-user-plus mr-2"></i>
        Assign Role
      </PrimaryButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="store.roleAssignments.length === 0"
      class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg"
    >
      <i class="pi pi-users text-4xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">
        No role assignments yet.
      </p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Assign users to roles to enable notifications and task routing.
      </p>
    </div>

    <!-- Role Assignments List -->
    <div v-else class="space-y-4">
      <div
        v-for="assignment in enrichedAssignments"
        :key="assignment.id"
        class="flex justify-between items-center p-4 border rounded-lg border-ccf-300 dark:border-slate-700"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
          >
            <i class="pi pi-user text-blue-600 dark:text-blue-400"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-slate-200">
                {{
                  assignment.displayName ||
                  assignment.userName ||
                  'Unknown User'
                }}
              </span>
              <Badge
                severity="info"
                class="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200"
              >
                {{ assignment.role || assignment.roleName || '—' }}
              </Badge>
            </div>
            <div class="text-sm text-gray-500 dark:text-slate-400">
              {{ assignment.userEmail || 'No email' }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Badge
            severity="secondary"
            class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {{ assignment.role }}
          </Badge>
          <SecondaryButton
            size="small"
            severity="danger"
            @click="handleDelete(assignment)"
          >
            Remove
          </SecondaryButton>
        </div>
      </div>
    </div>

    <!-- Available Roles Info -->
    <div
      v-if="availableRoles.length"
      class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
    >
      <h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">
        Available Roles
      </h4>
      <p class="text-sm text-blue-700 dark:text-blue-300">
        The following roles are defined in this workflow's steps:
      </p>
      <div class="flex flex-wrap gap-2 mt-2">
        <Badge v-for="role in availableRoles" :key="role" severity="secondary">
          {{ role }}
        </Badge>
      </div>
    </div>

    <!-- Assign Role Dialog -->
    <Dialog
      header="Assign Roles"
      :draggable="false"
      v-model:visible="showAssignDialog"
      modal
      class="w-full max-w-2xl"
    >
      <form @submit.prevent="handleAssignRoles" class="space-y-4">
        <div
          v-for="role in availableRoles"
          :key="role"
          class="p-4 border rounded-lg bg-white dark:bg-slate-900"
        >
          <div class="flex justify-between items-center mb-2">
            <div>
              <div
                class="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {{ role }}
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                Select a user for this role
              </div>
            </div>
            <Badge
              class="bg-indigo-100 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs px-2 py-0.5 rounded-full"
            >
              {{ role }}
            </Badge>
          </div>
          <AutoComplete
            :id="`role-user-${role}`"
            v-model="roleUserSelections[role]"
            :suggestions="userSuggestions"
            optionLabel="displayName"
            :filterBy="['displayName', 'email']"
            placeholder="Search users..."
            class="w-full"
            :forceSelection="false"
            @complete="searchUsers"
          >
            <template #item="{ item }">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-slate-100">{{
                  item.displayName
                }}</span>
                <span class="text-sm text-gray-500 dark:text-slate-400">{{
                  item.email
                }}</span>
              </div>
            </template>
            <template #selected="{ value }">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-slate-100">{{
                  value?.displayName
                }}</span>
                <span class="text-sm text-gray-500 dark:text-slate-400">{{
                  value?.email
                }}</span>
              </div>
            </template>
          </AutoComplete>
        </div>

        <Message v-if="assignError" severity="error">
          {{ assignError }}
        </Message>

        <div
          class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
        >
          <SecondaryButton type="button" @click="closeAssignDialog"
            >Cancel</SecondaryButton
          >
          <PrimaryButton type="submit" :disabled="isAssigning">
            <i v-if="isAssigning" class="pi pi-spin pi-spinner mr-2"></i>
            Assign Selected Roles
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useWorkflowInstances } from '@/composables/workflows';
import {
  useUserSearch,
  type DisplayUser,
} from '@/composables/workflows/useUserSearch';
import type { RoleAssignment } from '@/types/workflows';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import Message from '@/volt/Message.vue';

const store = useWorkflowInstanceStore();
const { createRoleAssignment, deleteRoleAssignment } = useWorkflowInstances();
const { userSuggestions, searchUsers, loadUsersByIds, getCachedUser } =
  useUserSearch();

const showAssignDialog = ref(false);
const roleUserSelections = reactive<Record<string, DisplayUser | null>>({});
const isAssigning = ref(false);
const assignError = ref('');

const workflowRoles = computed(() => {
  const steps = store.instance?.workflowDefinition?.steps ?? [];
  const roles = steps
    .map((step) => (step.responsibleRole ?? '').trim())
    .filter((role) => role.length > 0);
  return Array.from(new Set(roles));
});

const availableRoles = computed(() => {
  const assigned = new Set(
    enrichedAssignments.value.map((a) => a.role || a.roleName),
  );
  return workflowRoles.value.filter((role) => !assigned.has(role));
});

async function loadAssignedUsers() {
  const ids = Array.from(
    new Set(
      store.roleAssignments
        .map((assignment) => assignment.assignedToId ?? assignment.userId)
        .filter(Boolean) as string[],
    ),
  );
  await loadUsersByIds(ids);
}

watch(
  () => store.roleAssignments,
  () => {
    loadAssignedUsers();
  },
  { immediate: true, deep: true },
);

const enrichedAssignments = computed(() =>
  store.roleAssignments.map((assignment) => {
    const id = assignment.assignedToId ?? assignment.userId;
    const user = getCachedUser(id);
    const effectiveRole = (assignment.role ||
      assignment.roleName ||
      'Unknown') as string;
    return {
      ...assignment,
      displayName: user?.displayName,
      userEmail: user?.email,
      role: effectiveRole,
    };
  }),
);

function openAssignDialog() {
  availableRoles.value.forEach((role) => {
    roleUserSelections[role] = null;
  });
  assignError.value = '';
  showAssignDialog.value = true;
}

async function handleAssignRoles() {
  if (!store.instance) return;

  const selections = availableRoles.value
    .map((role) => ({ role, user: roleUserSelections[role] }))
    .filter((entry) => entry.user);

  if (!selections.length) {
    assignError.value = 'Select a user for at least one role';
    return;
  }

  isAssigning.value = true;
  assignError.value = '';
  try {
    for (const { role, user } of selections) {
      await createRoleAssignment(
        {
          workflowInstanceId: store.instance.id,
          roleName: role,
          assignedToType: 'user',
          assignedToId: user!.id,
        },
        (assignment) => {
          store.addRoleAssignmentLocally(assignment);
        },
      );
    }
    closeAssignDialog();
  } catch (error) {
    assignError.value =
      error instanceof Error ? error.message : 'Failed to assign roles';
  } finally {
    isAssigning.value = false;
  }
}

function closeAssignDialog() {
  showAssignDialog.value = false;
  Object.keys(roleUserSelections).forEach((role) => {
    roleUserSelections[role] = null;
  });
  assignError.value = '';
}

async function handleDelete(assignment: RoleAssignment) {
  await deleteRoleAssignment(assignment.id);
  store.removeRoleAssignmentLocally(assignment.id);
}
</script>
