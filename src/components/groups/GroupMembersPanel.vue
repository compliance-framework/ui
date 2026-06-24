<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold dark:text-slate-200">Members</h2>
      <PrimaryButton size="small" @click="showAddMember = true">
        <i class="pi pi-plus mr-2"></i>
        Add Member
      </PrimaryButton>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
      <p class="mt-3 text-gray-500 dark:text-slate-400">Loading members...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="membersError" class="text-center py-10">
      <i class="pi pi-exclamation-triangle text-4xl text-red-400"></i>
      <p class="mt-3 text-red-500">Error loading members.</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!members?.length" class="text-center py-10">
      <i class="pi pi-user-plus text-5xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-3 text-gray-500 dark:text-slate-400">No members yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-1">
        Click "Add Member" to add users to this group.
      </p>
    </div>

    <!-- Members Table -->
    <div
      v-else
      class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <table class="table-auto w-full dark:text-slate-300">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr class="border-b border-ccf-300 dark:border-slate-700">
            <th class="table-header">Name</th>
            <th class="table-header">Email</th>
            <th class="table-header">Source</th>
            <th class="table-header text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.userId"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800 last:border-b-0"
          >
            <td
              class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
            >
              {{ member.displayName || '—' }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              {{ emailByUserId[member.userId] ?? '—' }}
            </td>
            <td class="px-6 py-4">
              <Badge
                v-if="member.inherited"
                severity="info"
                v-tooltip.top="'Synced from IdP — cannot be removed here'"
              >
                Inherited (SSO)
              </Badge>
              <Badge v-else severity="secondary">Native</Badge>
            </td>
            <td class="px-6 py-4 text-right">
              <SecondaryButton
                v-if="!member.inherited"
                size="small"
                severity="danger"
                @click="removeMember(member)"
              >
                Remove
              </SecondaryButton>
              <span
                v-else
                class="text-gray-400 dark:text-slate-600 text-sm"
                v-tooltip.top="
                  'Inherited group memberships cannot be removed here'
                "
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
      header="Add Member"
      :draggable="false"
      v-model:visible="showAddMember"
    >
      <div class="pt-1">
        <label class="inline-block pb-2 dark:text-slate-300">
          Search users
        </label>
        <div class="flex items-start gap-2">
          <div class="flex-grow">
            <AutoComplete
              v-model="selectedUser"
              :suggestions="userSuggestions"
              optionLabel="displayName"
              :forceSelection="true"
              placeholder="Type at least 3 characters to search…"
              fluid
              @complete="searchUsers"
            >
              <template #option="{ option }">
                <span class="font-medium text-gray-900 dark:text-slate-100">
                  {{ option.displayName }}
                </span>
              </template>
            </AutoComplete>
            <p
              v-if="selectedUserIsMember"
              class="mt-1 text-sm text-amber-600 dark:text-amber-400"
            >
              {{ selectedUser?.displayName }} is already a member.
            </p>
          </div>
          <PrimaryButton :disabled="!canAdd" @click="addSelectedMember">
            {{ adding ? 'Adding…' : 'Add' }}
          </PrimaryButton>
        </div>

        <div class="mt-6 flex justify-end">
          <SecondaryButton @click="showAddMember = false">Done</SecondaryButton>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type {
  CCFUser,
  CCFGroupMember,
  ErrorBody,
  ErrorResponse,
} from '@/stores/types';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import {
  useUserSearch,
  type DisplayUser,
} from '@/composables/workflows/useUserSearch';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Tooltip from 'primevue/tooltip';

defineOptions({ directives: { tooltip: Tooltip } });

const props = defineProps<{ groupId: string }>();

const toast = useToast();
const showAddMember = ref(false);
const adding = ref(false);
const selectedUser = ref<DisplayUser | null>(null);

// Server-side user typeahead (mirrors Risk owner / Workflow role assignment).
// Scales to large user bases — no need to download every user up front.
const { userSuggestions, searchUsers } = useUserSearch();

// Reset the picker every time the dialog opens so a previous selection or
// stale suggestions never carry over.
watch(showAddMember, (open) => {
  if (open) {
    selectedUser.value = null;
    userSuggestions.value = [];
  }
});

const {
  data: members,
  isLoading,
  error: membersError,
  execute: fetchMembers,
} = useDataApi<CCFGroupMember[]>(
  `/api/admin/groups/${props.groupId}/members`,
  {},
  { immediate: false },
);

// The members endpoint returns only { userId, displayName }, so email is not
// available there. Fetch the user directory once to enrich the table with email
// addresses; if it fails (e.g. permissions) the table still renders names.
const { data: allUsers, execute: fetchAllUsers } = useDataApi<CCFUser[]>(
  '/api/admin/users',
  {},
  { immediate: false },
);

const axiosInstance = useAuthenticatedInstance();

const { execute: addExecute } = useDataApi<void>(
  `/api/admin/groups/${props.groupId}/members`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

const emailByUserId = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const user of allUsers.value ?? []) {
    if (user.id) map[user.id] = user.email;
  }
  return map;
});

function isMember(userId: string | undefined): boolean {
  if (!userId) return false;
  return (members.value ?? []).some((m) => m.userId === userId);
}

const selectedUserIsMember = computed(() => isMember(selectedUser.value?.id));

const canAdd = computed(
  () =>
    !!selectedUser.value?.id && !adding.value && !selectedUserIsMember.value,
);

async function addSelectedMember() {
  const user = selectedUser.value;
  if (!user?.id || !canAdd.value) return;
  adding.value = true;
  try {
    await addExecute({ data: { userId: user.id } });
    await fetchMembers();
    selectedUser.value = null;
    userSuggestions.value = [];
    toast.add({ severity: 'success', summary: 'Member added', life: 2000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error adding member',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
  } finally {
    adding.value = false;
  }
}

async function removeMember(member: CCFGroupMember) {
  try {
    await axiosInstance.delete(
      `/api/admin/groups/${props.groupId}/members/${member.userId}`,
    );
    members.value = (members.value ?? []).filter(
      (m) => m.userId !== member.userId,
    );
    toast.add({ severity: 'success', summary: 'Member removed', life: 2000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error removing member',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
  }
}

fetchMembers();
fetchAllUsers();
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}
</style>
