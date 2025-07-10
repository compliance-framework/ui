<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 py-3">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ importedCatalogsCount }}</div>
        <div class="text-sm text-blue-600 dark:text-blue-400">Imported Catalogs</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ includedControlsCount }}</div>
        <div class="text-sm text-green-600 dark:text-green-400">Included Controls</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ excludedControlsCount }}</div>
        <div class="text-sm text-purple-600 dark:text-purple-400">Excluded Controls</div>
      </div>
    </div>
    <CollapsableGroup v-for="imp in imports" :key="imp.href">
      <template #header>
        <div class="py-4 px-4 bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 flex flex-inline">
          <span class="grow font-medium"> {{ findResourceByHref(imp.href)?.title || 'No Title' }}</span>
          <PrimaryButton class="flex gap-2" @click="removeImport(imp)">Remove</PrimaryButton>
        </div>
      </template>
      <div class="px-4 py-4 bg-white dark:bg-slate-950 border border-ccf-300 dark:border-slate-700">
        <p>Included Controls</p>
        <ProfileControlGroups :groups="imp.includeControls" />
        <hr class="my-4 border-ccf-300 dark:border-slate-700 border-dashed" />
        <p>Excluded Controls</p>
        <ProfileControlGroups :groups="imp.excludeControls" />
        <PrimaryButton class="mt-2" @click="save(imp)">Save</PrimaryButton>
      </div>
    </CollapsableGroup>
    <PrimaryButton class="mt-4" @click="openCatalogDialog()">Add Catalog Import</PrimaryButton>
    <CatalogImportDialog
      :visible="catalogDialogVisible"
      :catalogs="catalogs"
      :importedCatalogs="importedCatalogs"
      @update:visible="catalogDialogVisible = $event"
      @import="addImport"
    />
  </div>
</template>

<script setup lang="ts">
import { type BackMatter, useProfileStore, type Import } from '@/stores/profiles';
import { type BackMatterResource } from '@/stores/component-definitions';
import { useRoute } from 'vue-router';
import { onActivated, ref, computed } from 'vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import type { DataResponse } from '@/stores/types';
import ProfileControlGroups from '@/components/profiles/ProfileControlGroups.vue';
import CatalogImportDialog from '@/components/profiles/CatalogImportDialog.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { type Catalog, useCatalogStore } from '@/stores/catalogs';

const profile = useProfileStore();
const imports = ref<Import[]>([] as Import[]);
const catalogs = ref<Catalog[]>([] as Catalog[]);
const route = useRoute();
const toast = useToast();
const confirm = useConfirm();
const id = route.params.id as string;

const importedCatalogs = ref<{ [key: string]: string }>({});

const backmatter = ref<BackMatter>({} as BackMatter);
const catalogDialogVisible = ref(false);

const importedCatalogsCount = computed<number>(() => imports.value.length);
const includedControlsCount = computed<number>(() => imports.value.reduce((acc, imp) => acc + (imp.includeControls ?? []).reduce((innerAcc, group) => innerAcc + group.withIds.length, 0), 0));
const excludedControlsCount = computed<number>(() => imports.value.reduce((acc, imp) => acc + (imp.excludeControls ?? []).reduce((innerAcc, group) => innerAcc + group.withIds.length, 0), 0));

function findResourceByHref(href: string): BackMatterResource | undefined {
  const hrefUUID = href.startsWith('#') ? href.substring(1) : href;
  return backmatter.value?.resources.find((resource) => resource.uuid === hrefUUID);
}

function save(imp: Import) {
  profile.updateImport(id, imp).then((newImp: DataResponse<Import>) => {
    toast.add({
      severity: 'success',
      summary: 'Import saved successfully',
      detail: `Import ${findResourceByHref(newImp.data.href)?.title || 'No Title'} has been updated.`,
      life: 3000,
    });
  }).catch((error) => {
    console.error('Error saving import:', error);
  });
}

function gatherImportedCatalogs() {
  importedCatalogs.value = {};
  for (const imp of imports.value) {
      const resource = findResourceByHref(imp.href);
      if (resource) {
        for (const rlink of resource.rlinks ?? []) {
          if (rlink.mediaType === 'application/ccf+oscal+json' && rlink.href.startsWith('#')) {
              const uuid = rlink.href.substring(1, rlink.href.length);
              importedCatalogs.value[uuid] = imp.href
            }
        }
      }
    }
}

function addImport(catalog: Catalog) {
  profile.addImport(id, catalog.uuid).then(() => {
    loadData();
    toast.add({
      severity: 'success',
      summary: 'Catalog imported successfully',
      detail: `Catalog ${catalog.metadata.title} has been imported.`,
      life: 3000,
    });
    catalogDialogVisible.value = false;
  }).catch((error) => {
    toast.add({
      severity: 'error',
      summary: 'Error importing catalog',
      detail: error.message,
      life: 3000,
    });
  });
}

function removeImport(imp: Import) {
  confirm.require({
    message: `Are you sure you want to remove the import for ${findResourceByHref(imp.href)?.title || 'No Title'}?`,
    header: 'Confirm Removal',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
    },
    acceptProps: {
      label: 'Remove',
      severity: 'danger',
    },
    accept: () => {
      profile.deleteImport(id, imp.href).then(() => {
        loadData();
        gatherImportedCatalogs();
        toast.add({
          severity: 'success',
          summary: 'Import removed successfully',
          detail: `Import ${findResourceByHref(imp.href)?.title || 'No Title'} has been removed.`,
          life: 3000,
        });
      }).catch((error) => {
        toast.add({
          severity: 'error',
          summary: 'Error removing import',
          detail: error.message,
          life: 3000,
        });
      });
    }
  });
}

function loadData() {
  Promise.all([
    profile.listImports(id),
    profile.getBackMatter(id)
  ]).then(([importsData, backmatterData]) => {
    imports.value = importsData.data;
    backmatter.value = backmatterData.data;
    gatherImportedCatalogs();
  });
}

function openCatalogDialog() {
  const catalogStore = useCatalogStore();
  catalogStore.list().then((response) => {
    catalogs.value = response.data;
    catalogDialogVisible.value = true;
  }).catch((error) => {
    toast.add({
      severity: 'error',
      summary: 'Error loading catalogs',
      detail: error.message,
      life: 3000,
    });
  });
}

onActivated(() => {
  loadData();
});

</script>
