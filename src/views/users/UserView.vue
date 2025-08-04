<template>
  <template v-if="loading">
    <tr>
      <td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
        Loading...
      </td>
    </tr>
  </template>
  <template v-else>
    <PageHeader>Viewing user: {{ user?.data.firstName }} {{ user?.data.lastName }}</PageHeader>
    <div class="flex flex-col md:flex-row gap-4 pt-10">
      <PageCard class="flex-grow">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4">User Details</h2>
          <p><strong>ID:</strong> {{ user?.data.id }} </p>
          <p><strong>Email:</strong> {{ user?.data.email }}</p>
          <p><strong>First Name:</strong> {{ user?.data.firstName }}</p>
          <p><strong>Last Name:</strong> {{ user?.data.lastName }}</p>
        </div>
      </PageCard>
      <PageCard class="flex-grow">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4">User Metadata</h2>
          <p><strong>Created At:</strong> {{ formatDate(user?.data.createdAt) }}</p>
          <p><strong>Updated At:</strong> {{ formatDate(user?.data.updatedAt) }}</p>
          <p><strong>Failed Logins:</strong> {{ user?.data.failedLogins }} failed attempts</p>
          <p><strong>Last Login:</strong> {{ formatDate(user?.data.lastLogin) ?? "Never logged in" }}</p>
          <p><strong>Is Active:</strong> {{ user?.data.isActive ? "Yes" : "No" }}</p>
          <p><strong>Is Locked out:</strong> {{ user?.data.isLocked ? "Yes" : "No" }}</p>
        </div>
      </PageCard>
    </div>
  </template>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useRoute, useRouter } from 'vue-router';
import { type DataResponse, useApi } from '@/composables/api';
import { type CCFUser } from '@/stores/types';
import { useMustAuthenticate } from '@/composables/useMustAuthenticate';
import { useToast } from 'primevue/usetoast';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import PageCard from '@/components/PageCard.vue';

const { watchForUnauthenticated } = useMustAuthenticate();

const route = useRoute();
const router = useRouter();
const toast = useToast();

const { data: user, loading, error, response } = useApi<DataResponse<CCFUser>>(new Request(`/api/users/${route.params.id}`));
watchForUnauthenticated(response);

watch(error, async () => {
  if (error.value) {
    const payload = await response.value?.json() as ErrorResponse<ErrorBody>;
    toast.add({ severity: 'error', summary: 'Error loading user', detail: payload.errors.body, life: 3000 });
    router.push({ name: 'users-list' });
  }
})

function formatDate(date?: string | Date | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
