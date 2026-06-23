<template>
  <PageHeader>Groups</PageHeader>
  <div
    class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th class="table-header">Name</th>
            <th class="table-header">Description</th>
            <th class="table-header">Members</th>
            <th class="table-header">Actions</th>
          </tr>
        </thead>
        <tbody class="table-body">
          <template v-if="isLoading">
            <tr>
              <td
                colspan="4"
                class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
              >
                Loading...
              </td>
            </tr>
          </template>
          <template v-else-if="error">
            <tr>
              <td colspan="4" class="px-6 py-4 text-center text-red-500">
                Error loading groups
              </td>
            </tr>
          </template>
          <template v-else-if="!groups?.length">
            <tr>
              <td
                colspan="4"
                class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
              >
                No groups found. Create one to get started.
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="group in groups"
              :key="group.id"
              class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-700 last:border-b-0"
            >
              <td class="py-2 px-6 font-medium">{{ group.name }}</td>
              <td class="py-2 px-6 text-gray-500 dark:text-slate-400">
                {{ group.description ?? '—' }}
              </td>
              <td class="py-2 px-6">{{ group.memberCount ?? 0 }}</td>
              <td class="py-1 px-6">
                <RouterLinkButton
                  variant="outlined"
                  :to="{ name: 'admin-group-view', params: { id: group.id } }"
                >
                  View
                </RouterLinkButton>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <PrimaryButton class="mt-4" @click="showDialog = true">
    Create Group
  </PrimaryButton>
  <Dialog modal header="Create Group" v-model:visible="showDialog">
    <GroupCreateForm @cancel="showDialog = false" @create="onCreated" />
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import type { CCFGroup } from '@/stores/types';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import GroupCreateForm from '@/components/groups/GroupCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';
import { useDataApi } from '@/composables/axios';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useToast } from 'primevue/usetoast';

const showDialog = ref(false);
const toast = useToast();

const {
  data: groups,
  isLoading,
  error,
  execute,
} = useDataApi<CCFGroup[]>('/api/admin/groups', {}, { immediate: false });

// No local error watcher needed: the global axios interceptor (composables/axios/index.ts)
// already fires a throttled "Permission denied" toast on 403 and an auth error on 401.
// Stacking a second local toast would show two overlapping warnings for the same request.
// Non-403/non-401 errors surface via the "Error loading groups" table cell above.

function onCreated(newGroup: CCFGroup) {
  showDialog.value = false;
  // shallowRef tracks reference changes only — mutating in place with push() would not
  // trigger reactivity, so we reassign the array.
  groups.value = [...(groups.value ?? []), newGroup];
  toast.add({
    severity: 'success',
    summary: 'Group created',
    detail: `Group "${newGroup.name}" has been created.`,
    life: 3000,
  });
}

onMounted(() => {
  execute();
});
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}

.table-body {
  @apply divide-y bg-white dark:divide-slate-700 dark:bg-slate-900;
}
</style>
