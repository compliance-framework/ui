<template>
  <PageHeader>Profiles</PageHeader>
  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700"
  >
    <table
      class="table-auto w-full rounded-full dark:text-slate-300 border-collapse"
    >
      <tbody v-if="isLoading">
        <tr>
          <td class="py-3 px-4 font-medium text-wrap">Loading ...</td>
        </tr>
      </tbody>
      <tbody v-else-if="error">
        <tr>
          <td class="py-3 px-4 font-medium text-wrap text-red-500">
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
          <td class="py-3 px-4 whitespace-nowrap grow">
            {{ profile.metadata.title }}
          </td>
          <td class="py-3 px-4 text-right">
            <RouterLink
              :to="{
                name: 'profile:view-controls',
                params: { id: profile.uuid },
              }"
              class="action-link"
              >View
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="my-4">
    <RouterLink
      :to="{ name: 'profile:create' }"
      class="action-link-primary ml-4"
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
