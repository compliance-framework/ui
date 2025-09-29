<template>
  <PageHeader>Catalogs</PageHeader>

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
          <template v-if="loading">
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
                Error loading catalogs: {{ error }}
              </td>
            </tr>
          </template>
          <template v-else-if="!catalogs?.length">
            <tr>
              <td
                colspan="2"
                class="px-6 py-4 text-center text-gray-500 dark:text-slate-400"
              >
                No catalogs found.
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              class="hover:bg-zinc-50 dark:hover:bg-slate-800"
              v-for="catalog in catalogs"
              :key="catalog.uuid"
            >
              <td
                class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {{ catalog.metadata.title }}
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex gap-2 justify-end">
                  <RouterLink
                    class="action-link-primary"
                    :to="{ name: 'catalog-view', params: { id: catalog.uuid } }"
                    >View
                  </RouterLink>
                  <PrimaryButton
                    @click="
                      downloadCatalogJSON(catalog.uuid, catalog.metadata.title)
                    "
                    title="Download Full Catalog JSON"
                  >
                    JSON
                  </PrimaryButton>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>

  <!--  <div class="mt-4">-->
  <!--    <RouterLink-->
  <!--      class="bg-transparent font-light hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800 border border-ccf-300 dark:border-slate-700 px-4 py-1 rounded-md"-->
  <!--      :to="{ name: 'catalog-create' }"-->
  <!--    >Create Catalog-->
  <!--    </RouterLink>-->
  <!--  </div>-->
</template>
<script setup lang="ts">
import { type Catalog } from '@/oscal';
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';

const toast = useToast();

const {
  data: catalogs,
  isLoading: loading,
  error,
} = useDataApi<Catalog[]>('/api/oscal/catalogs');

const { execute } = useDataApi<Catalog>(
  '/api/oscal/catalogs',
  {},
  { immediate: false },
);

async function downloadCatalogJSON(id: string, title: string) {
  try {
    const response = await execute(`/api/oscal/catalogs/${id}/full`);
    const jsonData = JSON.stringify(response.data.value?.data, null, 2);
    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-catalog.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'Catalog JSON Downloaded',
      detail: `Catalog "${title}" JSON downloaded successfully`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to download catalog JSON. Full catalog export may not be available.',
      life: 3000,
    });
  }
}
</script>
