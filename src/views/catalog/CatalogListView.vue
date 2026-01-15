<template>
  <PageHeader>Catalogs</PageHeader>

  <div
    class="mt-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <table class="table-auto w-full dark:text-slate-300" v-if="!loading">
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
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
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
              <RouterLinkButton
                :to="{ name: 'catalog-view', params: { id: catalog.uuid } }"
                >View
              </RouterLinkButton>
              <PrimaryButton
                @click="deleteCatalog(catalog.uuid, catalog.metadata.title)"
                title="Delete Catalog"
              >
                Delete
              </PrimaryButton>
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
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const { data: catalogs, isLoading: loading } = useDataApi<Catalog[]>(
  '/api/oscal/catalogs',
);

const { execute } = useDataApi<Catalog>(
  '/api/oscal/catalogs',
  {},
  { immediate: false },
);
const { execute: del } = useDataApi<void>(
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

async function deleteCatalog(uuid: string, title: string) {
  await confirmDeleteDialog(
    async () => {
      try {
        await del(`/api/oscal/catalogs/${uuid}`, { method: 'DELETE' });
        toast.add({
          severity: 'success',
          summary: 'Catalog deleted',
          detail: `Catalog "${title}" deleted successfully`,
          life: 3000,
        });
        const idx = catalogs.value?.findIndex((c) => c.uuid === uuid) ?? -1;
        if (idx >= 0 && catalogs.value) {
          catalogs.value.splice(idx, 1);
        }
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to delete catalog.',
          life: 3000,
        });
      }
    },
    { itemName: title, itemType: 'catalog' },
  );
}
</script>
