<template>
  <PageHeader>Users List</PageHeader>
  <div class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th class="table-header">
              Email
            </th>
            <th class="table-header">
              Firstname
            </th>
            <th class="table-header">
              Lastname
            </th>
            <th class="table-header">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="table-body">
          <template v-if="isLoading">
            <tr>
              <td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
                Loading...
              </td>
            </tr>
          </template>
          <template v-else-if="error">
            <tr>
              <td colspan="4" class="px-6 py-4 text-center text-red-500">
                Error loading users
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
            v-for="user in users"
            :key="user.id"
            class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-700 last:border-b-0"
            >
              <td class="py-2 px-6">{{ user.email }}</td>
              <td class="py-1 px-6">{{ user.firstName }}</td>
              <td class="py-1 px-6">{{ user.lastName }}</td>
              <td class="py-1 px-6">
                <RouterLink
                  :to="{ name: 'user-view', params: { id: user.id } }"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View
                </RouterLink>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <PrimaryButton class="mt-4" @click="showDialog = true">
    Create User
  </PrimaryButton>
  <Dialog modal header="Create User" v-model:visible="showDialog">
    <UserCreateForm @cancel="showDialog = false" @create="completed" />
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import type { CCFUser } from '@/stores/types';
import PrimaryButton from '@/components/PrimaryButton.vue';
import UserCreateForm from '@/components/users/UserCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';

const showDialog = ref(false);
const toast = useToast();

const { data: users, isLoading, error, execute } = useDataApi<CCFUser[]>('/api/users', {}, { immediate: false });

function completed(newUser: CCFUser) {
  showDialog.value = false;
  users.value?.push(newUser);
  toast.add({
    severity: 'success',
    summary: 'User created successfully',
    detail: `User ${newUser.firstName} ${newUser.lastName} has been created.`,
    life: 3000,
  });
}

onMounted(async () => {
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
