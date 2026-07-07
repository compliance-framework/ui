<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div>
      <PageHeader>Catalogs</PageHeader>
      <PageSubHeader>Manage OSCAL control catalogs</PageSubHeader>
    </div>
    <RouterLinkButton :to="{ name: 'catalog-create' }">
      <i class="pi pi-plus mr-2"></i>
      Create Catalog
    </RouterLinkButton>
  </div>

  <p v-if="loading" class="mt-6 text-sm text-gray-500 dark:text-slate-400">
    Loading catalogs…
  </p>

  <Tabs v-else v-model:value="activeTab" class="mt-6">
    <TabList>
      <Tab v-for="tab in TABS" :key="tab.value" :value="tab.value">
        {{ tab.label }}
        <span
          class="ml-2 inline-flex items-center justify-center rounded-full bg-ccf-100 px-2 py-0.5 text-xs font-semibold text-ccf-700 dark:bg-slate-700 dark:text-slate-300"
        >
          {{ grouped[tab.value].length }}
        </span>
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel
        v-for="tab in TABS"
        :key="tab.value"
        :value="tab.value"
        class="!px-0"
      >
        <div
          class="overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
        >
          <table
            v-if="grouped[tab.value].length"
            class="table-auto w-full dark:text-slate-300"
          >
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
                v-for="catalog in grouped[tab.value]"
                :key="catalog.uuid"
              >
                <td
                  class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
                >
                  <span class="inline-flex items-center gap-2">
                    {{ catalog.metadata.title }}
                    <span
                      v-if="!isCatalogActive(catalog)"
                      class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      Inactive
                    </span>
                  </span>
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                  <div class="flex gap-2 justify-end">
                    <RouterLinkButton
                      :to="{
                        name: 'catalog-view',
                        params: { id: catalog.uuid },
                      }"
                      >View
                    </RouterLinkButton>
                    <SecondaryButton
                      @click="toggleActive(catalog)"
                      :disabled="!can(RESOURCES.CATALOG, ACTIONS.UPDATE)"
                      v-tooltip.top="{
                        value: permissionTooltip(
                          RESOURCES.CATALOG,
                          ACTIONS.UPDATE,
                        ),
                        disabled: can(RESOURCES.CATALOG, ACTIONS.UPDATE),
                      }"
                      :title="
                        isCatalogActive(catalog)
                          ? 'Deactivate Catalog'
                          : 'Activate Catalog'
                      "
                    >
                      {{ isCatalogActive(catalog) ? 'Deactivate' : 'Activate' }}
                    </SecondaryButton>
                    <SecondaryButton
                      @click="
                        downloadCatalogJSON(
                          catalog.uuid,
                          catalog.metadata.title,
                        )
                      "
                      title="Download Full Catalog JSON"
                    >
                      JSON
                    </SecondaryButton>
                    <TertiaryButton
                      @click="
                        deleteCatalog(catalog.uuid, catalog.metadata.title)
                      "
                      title="Delete Catalog"
                      :disabled="!can(RESOURCES.CATALOG, ACTIONS.DELETE)"
                      v-tooltip.top="{
                        value: permissionTooltip(
                          RESOURCES.CATALOG,
                          ACTIONS.DELETE,
                        ),
                        disabled: can(RESOURCES.CATALOG, ACTIONS.DELETE),
                      }"
                      class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </TertiaryButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-else
            class="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400"
          >
            No {{ tab.label.toLowerCase() }} yet.
          </p>
        </div>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { type Catalog } from '@/oscal';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import {
  useCatalogDelete,
  useCatalogActiveToggle,
  catalogType,
  isCatalogActive,
  withCatalogActive,
  type CatalogType,
} from '@/composables/catalog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();
const toast = useToast();
const { deleteCatalog: deleteCatalogAction } = useCatalogDelete();
const { setCatalogActive } = useCatalogActiveToggle();

const { data: catalogs, isLoading: loading } = useDataApi<Catalog[]>(
  '/api/oscal/catalogs',
);

const TABS: { value: CatalogType; label: string }[] = [
  { value: 'standard', label: 'Standards' },
  { value: 'policy', label: 'Policies' },
  { value: 'procedure', label: 'Procedures' },
  { value: 'internal', label: 'Internal Catalogs' },
  { value: 'other', label: 'Other' },
];

const activeTab = ref<CatalogType>('standard');

const grouped = computed<Record<CatalogType, Catalog[]>>(() => {
  const groups: Record<CatalogType, Catalog[]> = {
    standard: [],
    policy: [],
    procedure: [],
    internal: [],
    other: [],
  };
  for (const catalog of catalogs.value ?? []) {
    groups[catalogType(catalog)].push(catalog);
  }
  return groups;
});

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

async function toggleActive(catalog: Catalog) {
  const next = !isCatalogActive(catalog);
  await setCatalogActive(
    catalog.uuid,
    catalog.metadata.title ?? '',
    next,
    () => {
      const idx =
        catalogs.value?.findIndex((c) => c.uuid === catalog.uuid) ?? -1;
      if (idx >= 0 && catalogs.value) {
        catalogs.value[idx] = withCatalogActive(catalogs.value[idx], next);
      }
    },
  );
}

async function deleteCatalog(uuid: string, title: string) {
  await deleteCatalogAction(uuid, title, () => {
    const idx = catalogs.value?.findIndex((c) => c.uuid === uuid) ?? -1;
    if (idx >= 0 && catalogs.value) {
      catalogs.value.splice(idx, 1);
    }
  });
}
</script>
