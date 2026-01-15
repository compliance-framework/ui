<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-4 px-4 flex items-center gap-4">
        <span
          class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1 mr-2"
          >{{ group.id }}</span
        >
        <div class="grow">
          {{ group.title }}
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1"
            >Group</span
          >
        </div>
        <TertiaryButton
          class="bg-white hover:bg-zinc-100 dark:bg-slate-800 dark:hover:bg-slate-600"
          @click.stop="deleteGroup()"
          >Delete</TertiaryButton
        >
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
import PartDisplayEditor from '@/components/PartDisplayEditor.vue';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  catalog: Catalog;
  group: Group;
}>();
const emit = defineEmits<{ (e: 'deleted', id: string): void }>();
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
</script>
