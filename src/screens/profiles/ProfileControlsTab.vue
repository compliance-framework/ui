<script setup lang="ts">
/**
 * A profile's Controls tab: which catalogs it imports and the controls it includes or excludes
 * from each, with Save and Remove per import and "Add catalog import". The control-group editor
 * and the catalog picker are classic islands. The script is the classic page's.
 */
import { type Import } from '@/oscal';
import type {
  BackMatterResource,
  BackMatter,
  ProfileSelectControlByID,
} from '@/oscal';
import { useRoute } from 'vue-router';
import { ref, computed, toValue, watch } from 'vue';
import ProfileControlGroups from '@/components/profiles/ProfileControlGroups.vue';
import CatalogImportDialog from '@/components/profiles/CatalogImportDialog.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { type Catalog } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { type AxiosError } from 'axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const updateDenied = computed(() =>
  can(RESOURCES.PROFILE, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing profiles.",
);
const route = useRoute();
const toast = useToast();
const confirm = useConfirm();
const id = route.params.id as string;

const importedCatalogsByUUID = ref<{ [key: string]: string }>({});
const importedCatalogsByHref = ref<{ [key: string]: string }>({});

const {
  data: imports,
  isLoading: importsLoading,
  execute: loadImports,
} = useDataApi<Import[]>(
  `/api/oscal/profiles/${id}/imports`,
  {},
  { immediate: true },
);
const {
  data: backmatter,
  isLoading: backmatterLoading,
  execute: loadBackmatter,
} = useDataApi<BackMatter>(
  `/api/oscal/profiles/${id}/back-matter`,
  {},
  { immediate: true },
);
const { data: updatedImport, execute: updateImport } = useDataApi<Import>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);
const { execute: deleteImport } = useDataApi(
  null,
  { method: 'DELETE' },
  { immediate: false },
);
const { execute: addImportExecute } = useDataApi<Import>(
  null,
  { method: 'POST' },
  { immediate: false },
);

const catalogDialogVisible = ref(false);

const importedCatalogsCount = computed<number>(
  () => imports.value?.length ?? 0,
);
const includedControlsCount = computed<number>(
  () =>
    imports.value?.reduce(
      (acc, imp) =>
        acc +
        (imp.includeControls ?? []).reduce(
          (innerAcc, group) => innerAcc + (group.withIds?.length || 0),
          0,
        ),
      0,
    ) ?? 0,
);
const excludedControlsCount = computed<number>(
  () =>
    imports.value?.reduce(
      (acc, imp) =>
        acc +
        (imp.excludeControls ?? []).reduce(
          (innerAcc, group) => innerAcc + (group.withIds?.length || 0),
          0,
        ),
      0,
    ) ?? 0,
);

function findResourceByHref(href: string): BackMatterResource | undefined {
  const hrefUUID = href.startsWith('#') ? href.substring(1) : href;
  return backmatter.value?.resources.find(
    (resource) => resource.uuid === hrefUUID,
  );
}

async function save(imp: Import) {
  try {
    await updateImport(
      `/api/oscal/profiles/${id}/imports/${encodeURIComponent(imp.href)}`,
      { data: imp },
    );
    await loadImports();
    toast.add({
      severity: 'success',
      summary: 'Import saved successfully',
      detail: `Import ${findResourceByHref(updatedImport.value?.href ?? '')?.title || 'No Title'} has been updated.`,
      life: 3000,
    });
  } catch (error) {
    console.error('Error saving import:', error);
  }
}

// Rebuilt when either list arrives: the classic page watched only imports, so when the back
// matter loaded second, no import resolved to its catalog and the control groups failed.
watch([imports, backmatter], async () => {
  importedCatalogsByUUID.value = {};
  importedCatalogsByHref.value = {};
  if (!imports.value) return;
  for (const imp of imports.value) {
    const resource = findResourceByHref(imp.href);
    if (resource) {
      for (const rlink of resource.rlinks ?? []) {
        if (
          rlink.mediaType === 'application/ccf+oscal+json' &&
          rlink.href.startsWith('#')
        ) {
          const uuid = rlink.href.substring(1, rlink.href.length);
          importedCatalogsByUUID.value[uuid] = imp.href;
          importedCatalogsByHref.value[imp.href] = uuid;
        }
      }
    }
  }
});

async function addImport(catalog: Catalog) {
  try {
    await addImportExecute(`/api/oscal/profiles/${id}/imports/add`, {
      data: {
        uuid: catalog.uuid,
        type: 'catalog',
      },
    });

    await loadBackmatter();
    await loadImports();

    toast.add({
      severity: 'success',
      summary: 'Catalog imported successfully',
      detail: `Catalog ${catalog.metadata.title} has been imported.`,
      life: 3000,
    });
    catalogDialogVisible.value = false;
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error importing catalog',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while importing the catalog.',
      life: 3000,
    });
  }
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
    accept: async () => {
      try {
        await deleteImport(
          `/api/oscal/profiles/${id}/imports/${encodeURIComponent(imp.href)}`,
        );
        toast.add({
          severity: 'success',
          summary: 'Import removed successfully',
          detail: `Import ${findResourceByHref(imp.href)?.title ?? imp.href} has been removed.`,
          life: 3000,
        });
        await loadBackmatter();
        await loadImports();
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        toast.add({
          severity: 'error',
          summary: 'Error removing import',
          detail:
            errorResponse?.response?.data?.errors.body ??
            'An error occurred while removing the import.',
          life: 3000,
        });
      }
    },
  });
}

function openCatalogDialog() {
  catalogDialogVisible.value = true;
}

const counts = computed(() => [
  {
    key: 'catalogs',
    label: 'Imported catalogs',
    value: importedCatalogsCount.value,
  },
  {
    key: 'included',
    label: 'Included controls',
    value: includedControlsCount.value,
  },
  {
    key: 'excluded',
    label: 'Excluded controls',
    value: excludedControlsCount.value,
  },
]);
</script>

<template>
  <DataState
    v-if="importsLoading || backmatterLoading"
    status="loading"
    subject="this profile's controls"
    skeleton="panel"
  />
  <Stack v-else gap="5">
    <DescriptionList :items="counts" />
    <Disclosure
      v-for="imp in imports"
      :key="imp.href"
      :label="findResourceByHref(imp.href)?.title || 'Untitled catalog'"
    >
      <Stack gap="4">
        <!-- The control groups load their catalog, so they wait until its ID is known. -->
        <LegacyPage v-if="importedCatalogsByHref[imp.href]">
          <Stack gap="4">
            <Text variant="label">Included controls</Text>
            <ProfileControlGroups
              :groups="imp.includeControls as ProfileSelectControlByID[]"
              :catalog="importedCatalogsByHref[imp.href]"
            />
            <Text variant="label">Excluded controls</Text>
            <ProfileControlGroups
              :groups="imp.excludeControls as ProfileSelectControlByID[]"
              :catalog="importedCatalogsByHref[imp.href]"
            />
          </Stack>
        </LegacyPage>
        <Cluster gap="2">
          <Button
            variant="primary"
            icon="save"
            :disabled-reason="updateDenied"
            @click="save(toValue(imp))"
            >Save</Button
          >
          <Button
            variant="danger"
            icon="delete"
            :disabled-reason="updateDenied"
            @click="removeImport(imp)"
            >Remove import</Button
          >
        </Cluster>
      </Stack>
    </Disclosure>
    <Text v-if="!imports?.length" variant="caption"
      >This profile doesn't import any catalogs yet. Add one to choose its
      controls.</Text
    >
    <div>
      <Button
        icon="add"
        :disabled-reason="updateDenied"
        @click="openCatalogDialog()"
        >Add catalog import</Button
      >
    </div>
  </Stack>
  <CatalogImportDialog
    :visible="catalogDialogVisible"
    :imported-catalogs="importedCatalogsByUUID"
    @update:visible="catalogDialogVisible = $event"
    @import="addImport"
  />
</template>
