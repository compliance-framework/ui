<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <PageHeader>Groups</PageHeader>
        <PageSubHeader>Manage groups and their members</PageSubHeader>
      </div>
      <PrimaryButton @click="showDialog = true">
        <i class="pi pi-plus mr-2"></i>
        Create Group
      </PrimaryButton>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">Loading groups...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <i class="pi pi-exclamation-triangle text-5xl text-red-400"></i>
      <p class="mt-4 text-red-500">Error loading groups.</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!groups?.length" class="text-center py-12">
      <i class="pi pi-users text-6xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">No groups found.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Create Group" to get started.
      </p>
    </div>

    <!-- Groups Table -->
    <div
      v-else
      class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
    >
      <table class="table-auto w-full dark:text-slate-300">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr class="border-b border-ccf-300 dark:border-slate-700">
            <th class="table-header">Name</th>
            <th class="table-header">Description</th>
            <th class="table-header">Members</th>
            <th class="table-header text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in groups"
            :key="group.id"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800 last:border-b-0"
          >
            <td
              class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
            >
              {{ group.name }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              {{ group.description ?? '—' }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
              {{ group.memberCount ?? 0 }}
            </td>
            <td class="px-6 py-4 text-right">
              <RouterLinkButton
                variant="outlined"
                :to="{ name: 'admin-group-view', params: { id: group.id } }"
              >
                View
              </RouterLinkButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog
      modal
      header="Create Group"
      :draggable="false"
      v-model:visible="showDialog"
    >
      <GroupCreateForm @cancel="showDialog = false" @create="onCreated" />
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { CCFGroup } from '@/stores/types';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import GroupCreateForm from '@/components/groups/GroupCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';
import { useDataApi } from '@/composables/axios';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const showDialog = ref(false);

const {
  data: groups,
  isLoading,
  error,
  execute,
} = useDataApi<CCFGroup[]>('/api/admin/groups', {}, { immediate: false });

// No local error watcher needed: the global axios interceptor (composables/axios/index.ts)
// already fires a throttled "Permission denied" toast on 403 and an auth error on 401.
// Stacking a second local toast would show two overlapping warnings for the same request.
// Non-403/non-401 errors surface via the "Error loading groups" state above.

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
</style>
