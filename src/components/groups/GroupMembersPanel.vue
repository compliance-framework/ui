<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold dark:text-slate-200">Members</h2>
      <PrimaryButton @click="showAddMember = true">Add Member</PrimaryButton>
    </div>

    <template v-if="isLoading">
      <p class="text-gray-500 dark:text-slate-400">Loading members...</p>
    </template>
    <template v-else-if="membersError">
      <p class="text-red-500">Error loading members.</p>
    </template>
    <template v-else-if="!members?.length">
      <p class="text-gray-500 dark:text-slate-400">No members yet.</p>
    </template>
    <template v-else>
      <div
        class="overflow-x-auto rounded-lg border border-ccf-300 dark:border-slate-700"
      >
        <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="table-header">Email</th>
              <th class="table-header">Name</th>
              <th class="table-header">Source</th>
              <th class="table-header">Actions</th>
            </tr>
          </thead>
          <tbody
            class="divide-y bg-white dark:divide-slate-700 dark:bg-slate-900"
          >
            <tr
              v-for="member in members"
              :key="member.userId"
              class="hover:bg-zinc-50 dark:hover:bg-slate-800"
            >
              <td class="py-2 px-6">{{ member.email }}</td>
              <td class="py-2 px-6">
                {{ member.firstName }} {{ member.lastName }}
              </td>
              <td class="py-2 px-6">
                <span
                  v-if="member.inherited"
                  class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  v-tooltip.top="'Synced from IdP — cannot be removed here'"
                >
                  Inherited (SSO)
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                >
                  Native
                </span>
              </td>
              <td class="py-2 px-6">
                <button
                  v-if="!member.inherited"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                  @click="removeMember(member)"
                >
                  Remove
                </button>
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
    </template>

    <Dialog modal header="Add Member" v-model:visible="showAddMember">
      <div class="px-8 py-6 min-w-80">
        <div class="mb-4">
          <label class="inline-block pb-2 dark:text-slate-300"
            >Search Users</label
          >
          <FormInput
            v-model="userSearch"
            placeholder="Filter by email or name"
          />
        </div>
        <p
          v-if="usersLoading"
          class="text-sm text-gray-500 dark:text-slate-400"
        >
          Loading users...
        </p>
        <p v-else-if="usersError" class="text-sm text-red-500">
          Error loading users.
        </p>
        <div
          v-else
          class="max-h-64 overflow-y-auto rounded border border-ccf-300 dark:border-slate-700"
        >
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-700 last:border-b-0"
          >
            <div>
              <p class="text-sm font-medium dark:text-slate-200">
                {{ user.firstName }} {{ user.lastName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400">
                {{ user.email }}
              </p>
            </div>
            <button
              class="text-sm font-medium text-ccf-600 hover:text-ccf-800 dark:text-blue-400 dark:hover:text-blue-300"
              :disabled="isMember(user.id) || adding"
              :class="{
                'opacity-40 cursor-not-allowed': isMember(user.id) || adding,
              }"
              @click="addMember(user.id)"
            >
              {{ isMember(user.id) ? 'Already added' : 'Add' }}
            </button>
          </div>
          <p
            v-if="!filteredUsers.length"
            class="px-4 py-3 text-sm text-gray-500 dark:text-slate-400"
          >
            No matching users.
          </p>
        </div>
        <PrimaryButton class="mt-4" @click="showAddMember = false"
          >Done</PrimaryButton
        >
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
import PrimaryButton from '@/components/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import FormInput from '@/components/forms/FormInput.vue';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Tooltip from 'primevue/tooltip';

defineOptions({ directives: { tooltip: Tooltip } });

const props = defineProps<{ groupId: string }>();

const toast = useToast();
const showAddMember = ref(false);
const userSearch = ref('');
const adding = ref(false);

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

const {
  data: availableUsers,
  isLoading: usersLoading,
  error: usersError,
  execute: fetchUsers,
} = useDataApi<CCFUser[]>('/api/admin/users', {}, { immediate: false });

const axiosInstance = useAuthenticatedInstance();

const { execute: addExecute } = useDataApi<void>(
  `/api/admin/groups/${props.groupId}/members`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

// Lazy: only load the full user list when the dialog first opens.
watch(showAddMember, (open) => {
  if (open && !availableUsers.value) fetchUsers();
});

const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase();
  return (availableUsers.value ?? []).filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q),
  );
});

function isMember(userId: string): boolean {
  return (members.value ?? []).some((m) => m.userId === userId);
}

async function addMember(userId: string) {
  if (adding.value) return;
  adding.value = true;
  try {
    await addExecute({ data: { userId } });
    await fetchMembers();
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
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}
</style>
