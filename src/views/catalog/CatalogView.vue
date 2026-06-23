<template>
  <div
    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
  >
    <div>
      <PageHeader>Catalog</PageHeader>
      <PageSubHeader>{{ catalog?.metadata?.title }}</PageSubHeader>
    </div>
    <div
      v-if="catalog"
      class="flex flex-wrap items-center gap-2 lg:justify-end"
    >
      <PrimaryButton
        @click="showControlForm = true"
        :disabled="!can(RESOURCES.CATALOG, ACTIONS.CREATE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE),
          disabled: can(RESOURCES.CATALOG, ACTIONS.CREATE),
        }"
      >
        <i class="pi pi-plus mr-2"></i>
        Add Control
      </PrimaryButton>
      <SecondaryButton
        @click="showGroupForm = true"
        :disabled="!can(RESOURCES.CATALOG, ACTIONS.CREATE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE),
          disabled: can(RESOURCES.CATALOG, ACTIONS.CREATE),
        }"
        >Add Group</SecondaryButton
      >
      <SecondaryButton
        @click="showEdit = true"
        :disabled="!can(RESOURCES.CATALOG, ACTIONS.UPDATE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.UPDATE),
          disabled: can(RESOURCES.CATALOG, ACTIONS.UPDATE),
        }"
        >Edit</SecondaryButton
      >
      <TertiaryButton
        @click="deleteCurrentCatalog"
        :disabled="!can(RESOURCES.CATALOG, ACTIONS.DELETE)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.DELETE),
          disabled: can(RESOURCES.CATALOG, ACTIONS.DELETE),
        }"
        class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        Delete
      </TertiaryButton>
    </div>
  </div>

  <div
    class="mt-6 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
    v-if="catalog"
  >
    <CatalogGroup
      v-for="group in groups"
      :key="group.id"
      :group="group"
      :catalog="catalog"
      @deleted="onGroupDeleted"
      @updated="reloadLists"
    />
    <CatalogControl
      v-for="control in controls"
      :key="control.id"
      :control="control"
      :catalog="catalog"
      @deleted="onControlDeleted"
      @updated="reloadLists"
    />
  </div>
  <div v-if="catalog">
    <GroupCreateModal
      @created="groupCreated"
      :catalog="catalog"
      v-model="showGroupForm"
    />
    <ControlCreateModal
      @created="controlCreated"
      :catalog="catalog"
      v-model="showControlForm"
    />
    <CatalogEditModal
      v-model="showEdit"
      :catalog="catalog"
      @updated="onCatalogUpdated"
    />
  </div>
  <div class="h-screen w-full"></div>
  <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>

<script setup lang="ts">
import { onActivated, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { type Catalog, type Group, type Control } from '@/oscal';
import { useRoute, useRouter } from 'vue-router';
import CatalogGroup from '@/views/catalog/CatalogGroup.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import CatalogControl from '@/views/catalog/CatalogControl.vue';
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import CatalogEditModal from '@/components/catalogs/CatalogEditModal.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useToast } from 'primevue/usetoast';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useCatalogDelete } from '@/composables/catalog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();
const toast = useToast();
const { deleteCatalog: deleteCatalogAction } = useCatalogDelete();
const route = useRoute();
const router = useRouter();
const catalogId = ref<string>(route.params.id as string);

const { data: catalog, execute } = useDataApi<Catalog>();
const { data: groups, execute: groupExecute } = useDataApi<Group[]>();
const { data: controls, execute: catalogExecute } = useDataApi<Control[]>();

async function loadData() {
  try {
    await execute(`/api/oscal/catalogs/${catalogId.value}`, {
      params: { page: 1, size: 1000 },
    });
    await groupExecute(`/api/oscal/catalogs/${catalogId.value}/groups`);
    await catalogExecute(`/api/oscal/catalogs/${catalogId.value}/controls`);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading catalog data',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the catalog data.',
      life: 3000,
    });
    router.push({ name: 'catalog-list' });
  }
}

onActivated(async () => {
  if (route.params.id !== catalogId.value) {
    catalogId.value = route.params.id as string;
    catalog.value = {
      uuid: route.params.id,
    } as Catalog;
    groups.value = [] as Group[];
    controls.value = [] as Control[];
  }
  await loadData();
});

const showGroupForm = ref<boolean>(false);
const showControlForm = ref<boolean>(false);
const showEdit = ref<boolean>(false);
function groupCreated(group: Group) {
  groups.value?.push(group);
}
function controlCreated(control: Control) {
  controls.value?.push(control);
}
function onControlDeleted() {
  reloadLists();
}
function onGroupDeleted() {
  reloadLists();
}

async function deleteCatalog(uuid: string, title: string) {
  await deleteCatalogAction(uuid, title, () => {
    router.push({ name: 'catalog-list' });
  });
}

function deleteCurrentCatalog() {
  deleteCatalog(catalogId.value, catalog.value?.metadata?.title || '');
}
function reloadLists() {
  groupExecute(`/api/oscal/catalogs/${catalogId.value}/groups`);
  catalogExecute(`/api/oscal/catalogs/${catalogId.value}/controls`);
}
function onCatalogUpdated(updated: Catalog) {
  catalog.value = updated;
  groupExecute(`/api/oscal/catalogs/${catalogId.value}/groups`);
  catalogExecute(`/api/oscal/catalogs/${catalogId.value}/controls`);
}
</script>
