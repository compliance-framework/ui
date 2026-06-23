<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-4 px-4 flex flex-wrap items-center gap-3">
        <span
          class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1"
          >{{ group.id }}</span
        >
        <div class="min-w-0 grow">
          <span class="font-medium text-gray-900 dark:text-slate-100">
            {{ group.title }}
          </span>
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1">
            Group
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <SecondaryButton
            size="small"
            @click.stop="showEdit = true"
            :disabled="!can(RESOURCES.CATALOG, ACTIONS.UPDATE)"
            v-tooltip.top="{
              value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.UPDATE),
              disabled: can(RESOURCES.CATALOG, ACTIONS.UPDATE),
            }"
          >
            Edit
          </SecondaryButton>
          <TertiaryButton
            size="small"
            @click.stop="showEditDescription = true"
            :disabled="!can(RESOURCES.CATALOG, ACTIONS.UPDATE)"
            v-tooltip.top="{
              value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.UPDATE),
              disabled: can(RESOURCES.CATALOG, ACTIONS.UPDATE),
            }"
          >
            Description
          </TertiaryButton>
          <TertiaryButton
            size="small"
            @click.stop="showGroupForm = true"
            :disabled="!can(RESOURCES.CATALOG, ACTIONS.CREATE)"
            v-tooltip.top="{
              value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE),
              disabled: can(RESOURCES.CATALOG, ACTIONS.CREATE),
            }"
          >
            <i class="pi pi-plus mr-1"></i>
            Group
          </TertiaryButton>
          <TertiaryButton
            size="small"
            @click.stop="showControlForm = true"
            :disabled="!can(RESOURCES.CATALOG, ACTIONS.CREATE)"
            v-tooltip.top="{
              value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.CREATE),
              disabled: can(RESOURCES.CATALOG, ACTIONS.CREATE),
            }"
          >
            <i class="pi pi-plus mr-1"></i>
            Control
          </TertiaryButton>
          <TertiaryButton
            size="small"
            class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            @click.stop="deleteGroup()"
            :disabled="!can(RESOURCES.CATALOG, ACTIONS.DELETE)"
            v-tooltip.top="{
              value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.DELETE),
              disabled: can(RESOURCES.CATALOG, ACTIONS.DELETE),
            }"
          >
            Delete
          </TertiaryButton>
        </div>
      </div>
    </template>
    <div
      class="px-4 py-4 dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700"
    >
      <template v-if="hasPart('assessment-objective')">
        <h4 class="font-medium mt-2">Objective:</h4>
        <p class="whitespace-pre-wrap">
          {{ getPart('assessment-objective')?.prose }}
        </p>
      </template>

      <div>
        <PartDisplayEditor
          v-for="part in group.parts"
          :key="part.id"
          :part="part"
        ></PartDisplayEditor>
      </div>

      <div
        class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
      >
        <CatalogControl
          v-for="control in controls"
          :key="control.id"
          :control="control"
          :catalog="props.catalog"
          @deleted="onChildControlDeleted"
        />
        <CatalogGroup
          v-for="group in groups"
          :key="group.id"
          :group="group"
          :catalog="props.catalog"
          @deleted="onChildGroupDeleted"
        />
      </div>
      <div class="mt-4">
        <GroupCreateModal
          @created="groupCreated"
          :catalog="catalog"
          :parent="props.group"
          v-model="showGroupForm"
        />
        <GroupDescriptionModal
          v-model="showEditDescription"
          :catalog="catalog"
          :group="props.group"
          @updated="onUpdated"
        />
        <GroupEditModal
          v-model="showEdit"
          :catalog="catalog"
          :group="props.group"
          @updated="onUpdated"
        />
        <ControlCreateModal
          @created="controlCreated"
          :catalog="catalog"
          :parent-group="props.group"
          v-model="showControlForm"
        />
      </div>
    </div>
  </CollapsableGroup>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import { type Catalog, type Group, type Control } from '@/oscal';
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import GroupEditModal from '@/components/catalogs/GroupEditModal.vue';
import GroupDescriptionModal from '@/components/catalogs/GroupDescriptionModal.vue';
import PartDisplayEditor from '@/components/PartDisplayEditor.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  catalog: Catalog;
  group: Group;
}>();
const emit = defineEmits<{
  (e: 'deleted', id: string): void;
  (e: 'updated', id: string): void;
}>();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const { execute: del } = useDataApi<void>(
  '/api/oscal/catalogs',
  {},
  { immediate: false },
);

const { data: groups } = useDataApi<Group[]>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}/groups`,
);
const { data: controls } = useDataApi<Control[]>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}/controls`,
);

function hasPart(type: string) {
  return props.group.parts?.find((part) => {
    return part.name == type;
  });
}

function getPart(type: string) {
  return props.group.parts?.find((part) => {
    return part.name == type;
  });
}

const showGroupForm = ref<boolean>(false);
const showControlForm = ref<boolean>(false);
const showEdit = ref<boolean>(false);
const showEditDescription = ref<boolean>(false);
function groupCreated(group: Group) {
  groups.value?.push(group);
}
function controlCreated(control: Control) {
  controls.value?.push(control);
}

function onChildGroupDeleted(id: string) {
  const idx = groups.value?.findIndex((g) => g.id === id) ?? -1;
  if (idx >= 0 && groups.value) {
    groups.value.splice(idx, 1);
  }
}
function onChildControlDeleted(id: string) {
  const idx = controls.value?.findIndex((c) => c.id === id) ?? -1;
  if (idx >= 0 && controls.value) {
    controls.value.splice(idx, 1);
  }
}
async function deleteGroup() {
  await confirmDeleteDialog(
    async () => {
      try {
        await del(
          `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`,
          { method: 'DELETE' },
        );
        toast.add({
          severity: 'success',
          summary: 'Group deleted',
          detail: `Group "${props.group.id}" deleted successfully`,
          life: 3000,
        });
        emit('deleted', props.group.id);
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail:
            error instanceof Error ? error.message : 'Failed to delete group.',
          life: 3000,
        });
      }
    },
    { itemName: props.group.id, itemType: 'group' },
  );
}

function onUpdated(updated: Group) {
  emit('updated', updated.id);
}
</script>
