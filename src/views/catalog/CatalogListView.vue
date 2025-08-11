<template>
  <PageHeader>Catalogs</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <table
      class="table-auto w-full rounded-full dark:text-slate-300"
      v-if="!loading"
    >
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="catalog in catalogs"
          :key="catalog.uuid"
        >
          <td class="py-3 px-4 whitespace-nowrap grow">
            {{ catalog.metadata.title }}
          </td>
          <td class="py-2 px-2 text-right whitespace-nowrap">
            <div class="flex gap-2">
              <RouterLink
                class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                :to="{ name: 'catalog-view', params: { id: catalog.uuid } }"
                >View
              </RouterLink>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md"
                @click="
                  downloadCatalogJSON(catalog.uuid, catalog.metadata.title)
                "
                title="Download Full Catalog JSON"
              >
                JSON
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
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
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from 'primevue/usetoast'
import { useDataApi } from '@/composables/axios'


const toast = useToast();

const {
  data: catalogs,
  isLoading: loading,
} = useDataApi<Catalog[]>('/api/oscal/catalogs');

const { execute } = useDataApi<Catalog>('/api/oscal/catalogs', {}, { immediate: false });

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
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        'Failed to download catalog JSON. Full catalog export may not be available.',
      life: 3000,
    });
  }
}
</script>
