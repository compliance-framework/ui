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
                :to="`/users/${user.id}`"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { type CCFUser, useUserManagementStore } from '@/stores/user-management';
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const users = ref<CCFUser[]>([]);

onMounted(async () => {
  const userManagementStore = useUserManagementStore();
  const response = await userManagementStore.list();
  users.value = response.data;
});
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}

.table-body {
  @apply divide-y divide-ccf-300 bg-white dark:divide-slate-700 dark:bg-slate-900;
}


</style>
