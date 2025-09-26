<template>
  <PageHeader>Component Definitions</PageHeader>

  <div
    class="my-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <table class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
          <th
            class="py-3 px-4 text-left font-medium text-gray-900 dark:text-slate-300"
          >
            Title
          </th>
          <th
            class="py-3 px-4 text-right font-medium text-gray-900 dark:text-slate-300"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="componentDefinition in componentDefinitions"
          :key="componentDefinition.uuid"
        >
          <td
            class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
          >
            {{ componentDefinition.metadata.title }}
          </td>
          <td class="px-6 py-4 text-right text-sm font-medium">
            <div class="flex gap-2 justify-end">
              <TertiaryButton
                :to="{
                  name: 'component-definition-overview',
                  params: { id: componentDefinition.uuid },
                }"
                >View
              </TertiaryButton>
              <PrimaryButton
                @click="
                  downloadJSON(
                    componentDefinition.uuid,
                    componentDefinition.metadata.title,
                  )
                "
                title="Download Full JSON"
              >
                JSON
              </PrimaryButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <TertiaryButton :to="{ name: 'component-definition-create' }">
      Create Component Definition
    </TertiaryButton>
  </div>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { type ComponentDefinition } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
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
