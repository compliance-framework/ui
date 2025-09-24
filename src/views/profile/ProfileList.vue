<template>
  <PageHeader>Profiles</PageHeader>
  <div
    class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-ccf-300 dark:divide-slate-700">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Title
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody
          class="divide-y divide-ccf-300 bg-white dark:divide-slate-700 dark:bg-slate-900"
        >
          <template v-if="isLoading">
            <tr>
              <td
                colspan="2"
                class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
              >
                Loading...
              </td>
            </tr>
          </template>
          <template v-else-if="error">
            <tr>
              <td colspan="2" class="px-6 py-4 text-center text-red-500">
                Error loading profiles
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              class="hover:bg-zinc-50 dark:hover:bg-slate-800"
              v-for="profile in profiles"
              :key="profile.uuid"
            >
              <td
                class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {{ profile.metadata.title }}
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex gap-2 justify-end">
                  <RouterLink
                    class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                    :to="{
                      name: 'profile:view-controls',
                      params: { id: profile.uuid },
                    }"
                    >View
                  </RouterLink>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <div class="my-4">
    <RouterLink
      :to="{ name: 'profile:create' }"
      class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md inline-block ml-4"
    >
      Create New Profile
    </RouterLink>
  </div>
</template>

<script lang="ts" setup>
import PageHeader from '@/components/PageHeader.vue';
import { type Profile } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const toast = useToast();

const {
  data: profiles,
  isLoading,
  error,
} = useDataApi<Profile[]>('/api/oscal/profiles');

watch(error, () => {
  if (error.value) {
    const axiosError = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading profiles',
      detail: axiosError.response?.data.errors.body || 'Unknown error',
      life: 3000,
    });
  }
});
</script>
