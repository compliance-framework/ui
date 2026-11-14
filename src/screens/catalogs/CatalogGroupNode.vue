<script setup lang="ts">
/**
 * A group in the catalog tree: a disclosure whose open state is remembered, holding the group's
 * parts, its controls and sub-groups, and a menu to edit it, its description, add a group or
 * control inside it, or delete it. Children are nodes too, so each level loads only once its
 * parent is opened. The forms are classic modals.
 */
import { computed, ref } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import { useToast } from 'primevue/usetoast';
import type { Catalog, Control, Group } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import { useCollapsibleGroupsStore } from '@/stores/collapsibleGroups';
import { getErrorDetail } from '@/utils/httpErrors';
import { partMarkdown } from '@/utils/oscal-parts';
import { useApiQuery } from '@/ds/query';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import GroupEditModal from '@/components/catalogs/GroupEditModal.vue';
import GroupDescriptionModal from '@/components/catalogs/GroupDescriptionModal.vue';
import CatalogControlNode from './CatalogControlNode.vue';

const props = defineProps<{ catalog: Catalog; group: Group }>();
const emit = defineEmits<{ deleted: [id: string]; updated: [] }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const store = useCollapsibleGroupsStore();

const key = `catalog:${props.catalog.uuid}:group:${props.group.id}`;
const open = computed({
  get: () => store.isOpen(key),
  set: (value: boolean) => store.setOpen(key, value),
});
const base = `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`;
const groups = useApiQuery<Group[]>(`${base}/groups`);
const controls = useApiQuery<Control[]>(`${base}/controls`);
const without = <T extends { id: string }>(list: T[] | undefined, id: string) =>
  (list ?? []).filter((item) => item.id !== id);

const label = computed(() => `${props.group.id} · ${props.group.title}`);
const parts = computed(() =>
  (props.group.parts ?? []).map((part) => ({
    id: part.id,
    markdown: partMarkdown(part),
  })),
);

const denied = (action: string) =>
  can(RESOURCES.CATALOG, action)
    ? undefined
    : "Your access doesn't include changing catalogs.";

const showEdit = ref(false);
const showDescription = ref(false);
const showGroupForm = ref(false);
const showControlForm = ref(false);
const confirmDelete = ref(false);

async function remove() {
  try {
    await api.delete(
      `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`,
    );
    toast.add({
      severity: 'success',
      summary: 'Group deleted',
      detail: `${props.group.id} was deleted.`,
      life: 3000,
    });
    emit('deleted', props.group.id);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The group wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const actions = computed<MenuEntry[]>(() => [
  {
    label: 'Edit group',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE),
    onSelect: () => (showEdit.value = true),
  },
  {
    label: 'Edit description',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE),
    onSelect: () => (showDescription.value = true),
  },
  {
    label: 'Add group inside',
    icon: 'add',
    disabledReason: denied(ACTIONS.CREATE),
    onSelect: () => (showGroupForm.value = true),
  },
  {
    label: 'Add control inside',
    icon: 'add',
    disabledReason: denied(ACTIONS.CREATE),
    onSelect: () => (showControlForm.value = true),
  },
  {
    label: 'Delete group',
    icon: 'delete',
    tone: 'danger',
    disabledReason: denied(ACTIONS.DELETE),
    onSelect: () => (confirmDelete.value = true),
  },
]);
</script>

<template>
  <Disclosure v-model:open="open" :label="label">
    <Stack gap="3">
      <Cluster justify="end">
        <Menu :label="`Actions for ${label}`" :items="actions" />
      </Cluster>
      <Text v-for="part in parts" :key="part.id" as="div" variant="prose"
        ><VueMarkdown :source="part.markdown"
      /></Text>
      <CatalogControlNode
        v-for="control in controls.data.value ?? []"
        :key="control.id"
        :catalog="catalog"
        :control="control"
        @deleted="
          (id) => (controls.data.value = without(controls.data.value, id))
        "
        @updated="emit('updated')"
      />
      <CatalogGroupNode
        v-for="child in groups.data.value ?? []"
        :key="child.id"
        :catalog="catalog"
        :group="child"
        @deleted="(id) => (groups.data.value = without(groups.data.value, id))"
        @updated="emit('updated')"
      />
      <Text
        v-if="
          groups.status.value === 'error' || controls.status.value === 'error'
        "
        variant="secondary"
        >Some of this group's contents didn't load.</Text
      >
    </Stack>
  </Disclosure>
  <GroupCreateModal
    v-model="showGroupForm"
    :catalog="catalog"
    :parent="group"
    @created="
      (g: Group) => (groups.data.value = [...(groups.data.value ?? []), g])
    "
  />
  <ControlCreateModal
    v-model="showControlForm"
    :catalog="catalog"
    :parent-group="group"
    @created="
      (c: Control) =>
        (controls.data.value = [...(controls.data.value ?? []), c])
    "
  />
  <GroupEditModal
    v-model="showEdit"
    :catalog="catalog"
    :group="group"
    @updated="emit('updated')"
  />
  <GroupDescriptionModal
    v-model="showDescription"
    :catalog="catalog"
    :group="group"
    @updated="emit('updated')"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${group.id}?`"
    confirm-label="Delete group"
    @confirm="remove"
    ><Text
      >The group, its sub-groups and their controls are deleted. This can't be
      undone.</Text
    ></ConfirmDialog
  >
</template>
