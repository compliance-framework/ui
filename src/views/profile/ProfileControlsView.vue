<template>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 py-3">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ imports.length }}</div>
        <div class="text-sm text-blue-600 dark:text-blue-400">Imported Catalogs</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ imports.reduce((acc, imp) => acc + (imp.includeControls ?? []).reduce((innerAcc, group) =>
          innerAcc + group.withIds.length, 0), 0) }}</div>
        <div class="text-sm text-green-600 dark:text-green-400">Included Controls</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ imports.reduce((acc, imp) => acc + (imp.excludeControls ?? []).reduce((innerAcc, group)  =>
          innerAcc + group.withIds.length, 0), 0) }}</div>
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
        <CollapsableGroup v-for="(controlGroup, idx) in imp.includeControls" :key="idx">
          <template #header>
            <div
              class="py-4 px-4 dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 flex flex-inline">
              <p class="grow whitespace-nowrap">Group {{ idx + 1 }}</p>
              <PrimaryButton class="flex gap-2" @click="removeControlGroup(imp.includeControls, idx)">Remove
              </PrimaryButton>
            </div>
          </template>
          <div class="px-4 py-4 bg-ccf-100 dark:bg-slate-950 border border-ccf-300 dark:border-slate-700">
            <ProfileControlEditor v-model="controlGroup.withIds" />
          </div>
        </CollapsableGroup>
        <PrimaryButton @click="createIncludeControlGroup(imp)" class="mt-4">Create Group</PrimaryButton>
        <hr class="my-4 border-ccf-300 dark:border-slate-700 border-dashed" />
        <p>Excluded Controls</p>
        <CollapsableGroup v-for="(controlGroup, idx) in imp.excludeControls" :key="idx">
          <template #header>
            <div
              class="py-4 px-4 dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 flex flex-inline">
              <p class="grow whitespace-nowrap">Group {{ idx + 1 }}</p>
              <PrimaryButton class="flex gap-2" @click="removeControlGroup(imp.excludeControls, idx)">Remove
              </PrimaryButton>
            </div>
          </template>
          <div class="px-4 py-4 bg-ccf-100 dark:bg-slate-950 border border-ccf-300 dark:border-slate-700">
            <ProfileControlEditor v-model="controlGroup.withIds" />
          </div>
        </CollapsableGroup>
        <PrimaryButton @click="createExcludeControlGroup(imp)" class="mt-4">Create Group</PrimaryButton><br>
        <PrimaryButton class="mt-2" @click="save(imp)">Save</PrimaryButton>
      </div>
    </CollapsableGroup>
    <PrimaryButton class="mt-4" @click="openCatalogDialog()">Add Catalog Import</PrimaryButton>

    <Dialog v-model:visible="catalogDialogVisible" modal header="Add Catalog">
      <table class="table-fixed">
        <thead class="bg-ccf-100 dark:bg-slate-800 text-ccf-700 dark:text-slate-200">
          <tr>
            <th class="p-2">Catalog Name</th>
            <th class="p-2">Catalog UUID</th>
            <th class="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="catalog in catalogs" :key="catalog.uuid">
            <td class="py-2 pr-3 font-medium text-wrap">{{ catalog.metadata.title }}</td>
            <td class="py-2 pr-3">
              <pre>{{ catalog.uuid }}</pre>
            </td>
            <td class="py-2 pr-3">
              <PrimaryButton
                :disabled="!!importedCatalogs[catalog.uuid]"
                @click="addImport(catalog)"
                class="disabled:text-ccf-600 disabled:bg-ccf-200 dark:disabled:bg-slate-700"
                v-tooltip.top="{ value: 'Catalog is already imported in this profile', disabled: !importedCatalogs[catalog.uuid] }"
              >Import</PrimaryButton>
            </td>
          </tr>
        </tbody>
      </table>
    </Dialog>
</template>

<script setup lang="ts">

import { type BackMatter, useProfileStore, type Import, type SelectControlsByID } from '@/stores/profiles';
import { type BackMatterResource } from '@/stores/component-definitions';
import { useRoute } from 'vue-router';
import { onActivated, ref } from 'vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import type { DataResponse } from '@/stores/types';
import ProfileControlEditor from '@/components/profiles/ProfileControlEditor.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Dialog from '@/volt/Dialog.vue';
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

function findResourceByHref(href: string): BackMatterResource | undefined {
  const hrefUUID = href.startsWith('#') ? href.substring(1) : href;
  return backmatter.value?.resources.find((resource) => resource.uuid === hrefUUID);
}

function createIncludeControlGroup(imp: Import) {
  const newGroup: SelectControlsByID = {
    withIds: [],
  };
  imp.includeControls.push(newGroup);
}


function createExcludeControlGroup(imp: Import) {
  const newGroup: SelectControlsByID = {
    withIds: [],
  };
  imp.excludeControls.push(newGroup);
}

function removeControlGroup(controlGroups: SelectControlsByID[], index: number) {
  controlGroups.splice(index, 1);
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
