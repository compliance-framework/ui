<script setup lang="ts">
/**
 * A control in the catalog tree: a disclosure whose open state is remembered, holding its evidence
 * results, statement (item by item, each item's ID on hover), objective and guidance, its attributes and its sub-controls, and a menu to
 * see its evidence, edit it or its parts, add a sub-control, or delete it. The forms are classic
 * modals.
 */
import { computed, ref } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import { useToast } from '@/ds/toasts';
import type { Catalog, Control } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { useCollapsibleGroupsStore } from '@/stores/collapsibleGroups';
import { getErrorDetail } from '@/utils/httpErrors';
import {
  insertParams,
  partMarkdown,
  partOutline,
  type PartOutlineItem,
} from '@/utils/oscal-parts';
import { useApiQuery } from '@/ds/query';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import Outline, { type OutlineItem } from '@/ds/components/Outline/Outline.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import ControlEditModal from '@/components/catalogs/ControlEditModal.vue';
import ControlPartEditModal from '@/components/catalogs/ControlPartEditModal.vue';

const props = defineProps<{ catalog: Catalog; control: Control }>();
const emit = defineEmits<{ deleted: [id: string]; updated: [] }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const store = useCollapsibleGroupsStore();

const key = `catalog:${props.catalog.uuid}:control:${props.control.id}`;
const open = computed({
  get: () => store.isOpen(key),
  set: (value: boolean) => store.setOpen(key, value),
});

const children = useApiQuery<Control[]>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}/controls`,
);
const evidence = useApiQuery<ComplianceIntervalStatus[]>(
  `/api/evidence/compliance-by-control/${props.control.id}`,
);
// A control the API lists as its own sub-control would nest forever; skip it.
const subControls = computed(() =>
  (children.data.value ?? []).filter((c) => c.id !== props.control.id),
);
const counts = computed(() =>
  computeEvidenceStatusCounts(evidence.data.value ?? []),
);

const label = computed(() => `${props.control.id} · ${props.control.title}`);
const partOf = (name: string) =>
  props.control.parts?.find((part) => part.name === name);
/** Text with the control's parameters written out: its values, or NIST's "[Assignment: …]". */
const withParams = (text: string) => insertParams(text, props.control.params);
/** The outline item for a statement item, with its ID on hover. */
const withHint = (item: PartOutlineItem): OutlineItem => ({
  ...item,
  text: withParams(item.text),
  hint: item.id || undefined,
  items: item.items.map(withHint),
});
const parts = computed(() =>
  (props.control.parts ?? []).map((part) => ({
    id: part.id,
    name: part.name.replace(/-/g, ' '),
    markdown: withParams(partMarkdown(part)),
    // A statement shows its items one by one, as implementations are written against them.
    outline:
      part.name === 'statement' ? partOutline(part).map(withHint) : undefined,
  })),
);
const attributes = computed(() => [
  { key: 'id', label: 'ID', value: props.control.id },
  { key: 'class', label: 'Class', value: props.control.class },
]);

const denied = (action: string) =>
  can(RESOURCES.CATALOG, action)
    ? undefined
    : "Your access doesn't include changing catalogs.";

const showEdit = ref(false);
const showControlForm = ref(false);
const editingPart = ref<'statement' | 'assessment-objective' | 'guidance'>();
const partOpen = computed({
  get: () => Boolean(editingPart.value),
  set: (value: boolean) => {
    if (!value) editingPart.value = undefined;
  },
});
const confirmDelete = ref(false);

async function remove() {
  try {
    await api.delete(
      `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}`,
    );
    toast.add({
      severity: 'success',
      summary: 'Control deleted',
      detail: `${props.control.id} was deleted.`,
      life: 3000,
    });
    emit('deleted', props.control.id);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The control wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const actions = computed<MenuEntry[]>(() => [
  ...(props.control.class
    ? [
        {
          label: 'Evidence for this control',
          icon: 'evidence' as const,
          to: {
            name: 'catalog-control-evidence',
            params: { catalog: props.catalog.uuid, id: props.control.id },
          },
        },
      ]
    : []),
  {
    label: 'Edit control',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE),
    onSelect: () => (showEdit.value = true),
  },
  {
    label: partOf('statement') ? 'Edit statement' : 'Add statement',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE),
    onSelect: () => (editingPart.value = 'statement'),
  },
  ...(['assessment-objective', 'guidance'] as const)
    .filter((name) => !partOf(name))
    .map((name) => ({
      label: name === 'guidance' ? 'Add guidance' : 'Add objective',
      icon: 'add' as const,
      disabledReason: denied(ACTIONS.UPDATE),
      onSelect: () => (editingPart.value = name),
    })),
  {
    label: 'Add sub-control',
    icon: 'add',
    disabledReason: denied(ACTIONS.CREATE),
    onSelect: () => (showControlForm.value = true),
  },
  {
    label: 'Delete control',
    icon: 'delete',
    tone: 'danger',
    disabledReason: denied(ACTIONS.DELETE),
    onSelect: () => (confirmDelete.value = true),
  },
]);
</script>

<template>
  <Disclosure :id="`control-${control.id}`" v-model:open="open" :label="label">
    <Stack gap="3">
      <Cluster justify="between" gap="2">
        <Cluster v-if="counts.total" gap="1">
          <StatusBadge
            v-if="counts.green"
            status="satisfied"
            :count="counts.green"
            compact
          />
          <StatusBadge
            v-if="counts.red"
            status="not-satisfied"
            :count="counts.red"
            compact
          />
          <StatusBadge
            v-if="counts.gray"
            status="unknown"
            :count="counts.gray"
            compact
          />
        </Cluster>
        <Text v-else variant="caption">No evidence yet.</Text>
        <Menu :label="`Actions for ${label}`" :items="actions" />
      </Cluster>
      <Stack v-for="part in parts" :key="part.id" gap="1">
        <Text variant="label">{{ part.name }}</Text>
        <template v-if="part.outline?.length">
          <Text v-if="partOf('statement')?.prose" variant="prose">{{
            withParams(partOf('statement')?.prose ?? '')
          }}</Text>
          <Outline :items="part.outline" />
        </template>
        <Text v-else as="div" variant="prose"
          ><VueMarkdown :source="part.markdown"
        /></Text>
      </Stack>
      <DescriptionList :items="attributes" layout="inline" />
      <CatalogControlNode
        v-for="child in subControls"
        :key="child.id"
        :catalog="catalog"
        :control="child"
        @deleted="
          (id) =>
            (children.data.value = (children.data.value ?? []).filter(
              (c) => c.id !== id,
            ))
        "
        @updated="emit('updated')"
      />
    </Stack>
  </Disclosure>
  <ControlCreateModal
    v-model="showControlForm"
    :catalog="catalog"
    :parent-control="control"
    @created="
      (c: Control) =>
        (children.data.value = [...(children.data.value ?? []), c])
    "
  />
  <ControlEditModal
    v-model="showEdit"
    :catalog="catalog"
    :control="control"
    @updated="emit('updated')"
  />
  <ControlPartEditModal
    v-if="editingPart"
    v-model="partOpen"
    :catalog="catalog"
    :control="control"
    :type="editingPart"
    @updated="emit('updated')"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${control.id}?`"
    confirm-label="Delete control"
    @confirm="remove"
    ><Text
      >The control and its sub-controls are deleted. This can't be undone.</Text
    ></ConfirmDialog
  >
</template>
