<script setup lang="ts">
/**
 * A catalog (/catalogs/:id): its controls as a tree of groups. The header and actions are the
 * design system's; the control tree and the add, edit and delete dialogs are the classic ones
 * (legacy islands). The script is the classic page's.
 */
import { onActivated, ref } from 'vue';
import { type Catalog, type Group, type Control } from '@/oscal';
import { useRoute, useRouter } from 'vue-router';
import CatalogGroup from '@/views/catalog/CatalogGroup.vue';
import CatalogControl from '@/views/catalog/CatalogControl.vue';
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import CatalogEditModal from '@/components/catalogs/CatalogEditModal.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Button from '@/ds/components/Button/Button.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';
import { useToast } from 'primevue/usetoast';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import {
  useCatalogDelete,
  useCatalogActiveToggle,
  isCatalogActive,
  withCatalogActive,
} from '@/composables/catalog';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

// Kept alive by AppShell, so the tree keeps its open groups when you visit a control and come back.
defineOptions({ name: 'CatalogScreen' });

const { can } = usePermissions();
const denied = (action: string, verb: string) =>
  can(RESOURCES.CATALOG, action)
    ? undefined
    : `Your access doesn't include ${verb} catalogs.`;
const toast = useToast();
const { deleteCatalog: deleteCatalogAction } = useCatalogDelete();
const { setCatalogActive } = useCatalogActiveToggle();
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

async function toggleActive() {
  if (!catalog.value) return;
  const current = catalog.value;
  const next = !isCatalogActive(current);
  await setCatalogActive(
    catalogId.value,
    current.metadata?.title ?? '',
    next,
    () => {
      catalog.value = withCatalogActive(current, next);
    },
  );
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

<template>
  <RecordTemplate :title="catalog?.metadata?.title || 'Catalog'">
    <template #status>
      <Tag v-if="catalog && !isCatalogActive(catalog)" label="Inactive" />
    </template>
    <template v-if="catalog" #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'changing')"
        @click="showControlForm = true"
        >Add control</Button
      >
      <Button
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'changing')"
        @click="showGroupForm = true"
        >Add group</Button
      >
      <Button
        icon="edit"
        :disabled-reason="denied(ACTIONS.UPDATE, 'changing')"
        @click="showEdit = true"
        >Edit</Button
      >
      <Button
        :icon="isCatalogActive(catalog) ? 'paused' : 'check'"
        :disabled-reason="denied(ACTIONS.UPDATE, 'changing')"
        @click="toggleActive"
        >{{ isCatalogActive(catalog) ? 'Deactivate' : 'Activate' }}</Button
      >
      <Button
        variant="danger"
        icon="delete"
        :disabled-reason="denied(ACTIONS.DELETE, 'deleting')"
        @click="deleteCurrentCatalog"
        >Delete</Button
      >
    </template>

    <Stack v-if="catalog" gap="4">
      <Text v-if="!groups?.length && !controls?.length" variant="caption"
        >This catalog has no groups or controls yet. Add a group to organise
        controls, or add a control directly.</Text
      >
      <LegacyPage>
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
      </LegacyPage>
    </Stack>
  </RecordTemplate>

  <template v-if="catalog">
    <GroupCreateModal
      v-model="showGroupForm"
      :catalog="catalog"
      @created="groupCreated"
    />
    <ControlCreateModal
      v-model="showControlForm"
      :catalog="catalog"
      @created="controlCreated"
    />
    <CatalogEditModal
      v-model="showEdit"
      :catalog="catalog"
      @updated="onCatalogUpdated"
    />
  </template>
</template>
