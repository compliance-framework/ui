<template>
  <PageHeader>Component Definitions</PageHeader>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="componentDefinition in componentDefinitions"
          :key="componentDefinition.uuid"
        >
          <td class="py-3 px-4 whitespace-nowrap grow">
            {{ componentDefinition.metadata.title }}
          </td>
          <td class="py-2 px-2 text-right whitespace-nowrap">
            <div class="flex gap-2">
              <RouterLink
                class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                :to="{
                  name: 'component-definition-overview',
                  params: { id: componentDefinition.uuid },
                }"
                >View
              </RouterLink>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md"
                @click="
                  downloadJSON(
                    componentDefinition.uuid,
                    componentDefinition.metadata.title,
                  )
                "
                title="Download Full JSON"
              >
                JSON
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <RouterLink
      class="bg-transparent font-light hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800 border border-ccf-300 dark:border-slate-700 px-4 py-1 rounded-md"
      :to="{ name: 'component-definition-create' }"
      >Create Component Definition
    </RouterLink>
  </div>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { type ComponentDefinition } from '@/stores/component-definitions.ts';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { type ErrorResponse, type ErrorBody } from '@/stores/types';
import decamelizeKeys from 'decamelize-keys';

const toast = useToast();

const { data: componentDefinitions } = useDataApi<ComponentDefinition[]>(
  '/api/oscal/component-definitions',
);
const { execute: executeDownloadJSON } = useDataApi<ComponentDefinition>();

async function downloadJSON(id: string, title: string) {
  try {
    // Get raw API response without camelCase conversion
    const response = await executeDownloadJSON(
      `/api/oscal/component-definitions/${id}/full`,
    );
    const jsonData = JSON.stringify(
      decamelizeKeys(response.data.value?.data ?? {}, {
        deep: true,
        separator: '-',
      }),
      null,
      2,
    );

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-component-definition.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: `Component definition JSON downloaded successfully`,
      life: 3000,
    });
  } catch (error) {
    const responseError = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download component definition JSON: ${responseError.response?.data.errors.body || 'Unknown error'}`,
      life: 3000,
    });
  }
}
</script>
