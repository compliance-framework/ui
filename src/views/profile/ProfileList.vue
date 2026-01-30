<template>
  <PageHeader>Profiles</PageHeader>
  <div class="mt-2">
    <RouterLinkButton class="mr-2" :to="{ name: 'profile:build-props' }">
      Build Profile by Props
    </RouterLinkButton>
  </div>
  <div
    class="mt-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <table class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
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
      <tbody v-if="isLoading">
        <tr>
          <td
            colspan="2"
            class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
          >
            Loading...
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="error">
        <tr>
          <td colspan="2" class="px-6 py-4 text-center text-red-500">
            Error loading profiles
          </td>
        </tr>
      </tbody>
      <tbody v-else>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="profile in profiles"
          :key="profile.uuid"
        >
          <td
            class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
          >
            {{ profile.metadata.title }}
          </td>
          <td class="px-6 py-4 text-right text-sm font-medium">
            <RouterLinkButton
              variant="outlined"
              :to="{
                name: 'profile:view-controls',
                params: { id: profile.uuid },
              }"
              >View
            </RouterLinkButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="my-4">
    <RouterLinkButton :to="{ name: 'profile:create' }">
      Create New Profile
    </RouterLinkButton>
    <RouterLinkButton class="ml-2" :to="{ name: 'profile:build-props' }">
      Build Profile by Props
    </RouterLinkButton>
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
import RouterLinkButton from '@/components/RouterLinkButton.vue';

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
