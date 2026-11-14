<script setup lang="ts">
/**
 * Inventory (/inventory): inventory items from security plans, evidence, POA&Ms and assessments,
 * filtered by source and asset type (both in the address). Items from the current system's plan
 * can be edited, attached to its components and deleted; any item can be viewed in full or
 * downloaded.
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';
import type { InventoryItem } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { useProps } from '@/composables/useProps';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import { useSystemStore } from '@/stores/system';
import { downloadText } from '@/utils/download-json';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import InventoryItemCreateForm from './InventoryItemCreateForm.vue';
import InventoryItemEditForm from './InventoryItemEditForm.vue';
import InventoryItemRelationsForm from './InventoryItemRelationsForm.vue';

interface Item extends InventoryItem {
  source: string;
  sourceId: string;
  sourceType: string;
}

const SOURCES = [
  { value: 'ssp', label: 'Security plans', param: 'include_ssp' },
  { value: 'evidence', label: 'Evidence', param: 'include_evidence' },
  { value: 'poam', label: 'POA&Ms', param: 'include_poam' },
  { value: 'ap', label: 'Assessment plans', param: 'include_ap' },
  { value: 'ar', label: 'Assessment results', param: 'include_ar' },
];
const DEFAULT_SOURCES = ['ssp', 'evidence', 'poam'];
const TYPES = [
  { value: '', label: 'All types' },
  ...[
    'operating-system',
    'database',
    'web-server',
    'firewall',
    'router',
    'switch',
    'appliance',
    'dns-server',
    'email-server',
    'directory-server',
    'storage-array',
  ].map((value) => ({
    value,
    label: value
      .split('-')
      .map((w) => (w === 'dns' ? 'DNS' : w[0]!.toUpperCase() + w.slice(1)))
      .join(' '),
  })),
];
const SOURCE_LABELS: Record<string, string> = {
  ssp: 'Security plan',
  evidence: 'Evidence',
  poam: 'POA&M',
  ap: 'Assessment plan',
  'assessment-plan': 'Assessment plan',
  ar: 'Assessment results',
  'assessment-results': 'Assessment results',
};

const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const { firstOfProps } = useProps();
const { system } = useSystemStore();
const sspId = computed(() => system.securityPlan?.uuid);

// View (URL) ---------------------------------------------------------------------------------

const sources = computed<string[]>({
  get: () => {
    const raw = route.query.sources;
    return typeof raw === 'string'
      ? raw.split(',').filter((s) => SOURCES.some((o) => o.value === s))
      : DEFAULT_SOURCES;
  },
  set: (next) => {
    const same =
      next.length === DEFAULT_SOURCES.length &&
      DEFAULT_SOURCES.every((s) => next.includes(s));
    void router.push({
      query: { ...route.query, sources: same ? undefined : next.join(',') },
    });
  },
});
const type = computed<string>({
  get: () => TYPES.find((t) => t.value === route.query.type)?.value ?? '',
  set: (next) =>
    void router.push({ query: { ...route.query, type: next || undefined } }),
});

const url = computed(() => {
  // With no source chosen, the API is asked for the defaults.
  const chosen = sources.value.length ? sources.value : DEFAULT_SOURCES;
  const params = new URLSearchParams();
  for (const source of SOURCES)
    params.append(source.param, String(chosen.includes(source.value)));
  if (type.value) params.append('item_type', type.value);
  return `/api/oscal/inventory?${params}`;
});

const items = useApiQuery<Item[]>(url, {
  isEmpty: (list) => list.length === 0,
});

const chips = computed(() => [
  ...(sources.value.join() !== DEFAULT_SOURCES.join()
    ? [
        {
          label: `Sources: ${
            sources.value
              .map((s) => SOURCES.find((o) => o.value === s)!.label)
              .join(', ') || 'none'
          }`,
        },
      ]
    : []),
  ...(type.value
    ? [{ label: `Type: ${TYPES.find((t) => t.value === type.value)!.label}` }]
    : []),
]);
function clearFilters() {
  void router.push({
    query: { ...route.query, sources: undefined, type: undefined },
  });
}

// Rows ---------------------------------------------------------------------------------------

// Evidence items often carry only labels, so their `name` prop names them.
const assetId = (item: Item) =>
  firstOfProps(item.props, 'asset-id')?.value ||
  item.description ||
  firstOfProps(item.props, 'name')?.value ||
  firstOfProps(item.props, 'app_name')?.value;
const assetType = (item: Item) =>
  firstOfProps(item.props, 'asset-type')?.value || 'Unknown';

const rows = computed(() =>
  (items.data.value ?? []).map((item) => ({
    id: `${item.sourceType}:${item.sourceId}:${item.uuid}`,
    name: assetId(item) || 'Unnamed item',
    assetType: assetType(item),
    sourceType: SOURCE_LABELS[item.sourceType] ?? item.sourceType,
    source: item.source,
    item,
  })),
);
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Item', minWidth: 'sm' },
  { key: 'assetType', label: 'Asset type', nowrap: true },
  { key: 'sourceType', label: 'From', nowrap: true },
  { key: 'source', label: 'Source' },
];

const fromThisPlan = (item: Item) =>
  Boolean(sspId.value) && item.sourceType === 'ssp';
const changeDenied = computed(() =>
  can(RESOURCES.INVENTORY, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing inventory.",
);

// Dialogs ------------------------------------------------------------------------------------

const viewing = ref<Item>();
const creating = ref(false);
const editing = ref<Item>();
const attaching = ref<Item>();
const deleting = ref<Item>();
const openWhile = (target: { value: Item | undefined }) =>
  computed({
    get: () => Boolean(target.value),
    set: (open: boolean) => {
      if (!open) target.value = undefined;
    },
  });
const viewOpen = openWhile(viewing);
const editOpen = openWhile(editing);
const attachOpen = openWhile(attaching);
const deleteOpen = openWhile(deleting);

function done(close: () => void, summary: string) {
  close();
  items.retry();
  toast.add({ severity: 'success', summary, life: 3000 });
}

const details = computed(() => {
  const item = viewing.value;
  if (!item) return [];
  return [
    { key: 'description', label: 'Description', value: item.description },
    { key: 'type', label: 'Asset type', value: assetType(item) },
    {
      key: 'source',
      label: 'Source',
      value: `${SOURCE_LABELS[item.sourceType] ?? item.sourceType}: ${item.source}`,
    },
    {
      key: 'props',
      label: 'Properties',
      value: (item.props ?? []).map((p) => `${p.name}: ${p.value}`).join(', '),
    },
    {
      key: 'components',
      label: 'Implemented components',
      value: (item.implementedComponents ?? [])
        .map((c) => c.componentUuid)
        .join(', '),
    },
    { key: 'remarks', label: 'Remarks', value: item.remarks },
    { key: 'uuid', label: 'UUID', value: item.uuid },
  ];
});

async function remove() {
  const item = deleting.value;
  deleting.value = undefined;
  if (!item) return;
  try {
    await api.delete(
      `/api/oscal/system-security-plans/${item.sourceId}/system-implementation/inventory-items/${item.uuid}`,
    );
    items.retry();
    toast.add({
      severity: 'success',
      summary: 'Item deleted',
      detail: `${assetId(item) || 'The item'} was deleted.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The item wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function actions(item: Item): MenuEntry[] {
  const own = fromThisPlan(item);
  const notOwn = own
    ? changeDenied.value
    : "Only items in this system's security plan can be changed here.";
  return [
    {
      label: 'View details',
      icon: 'details',
      onSelect: () => (viewing.value = item),
    },
    {
      label: 'Edit item',
      icon: 'edit',
      disabledReason: notOwn,
      onSelect: () => (editing.value = item),
    },
    {
      label: 'Attach to components',
      icon: 'link',
      disabledReason: notOwn,
      onSelect: () => (attaching.value = item),
    },
    {
      label: 'Download JSON',
      icon: 'download',
      onSelect: () =>
        downloadText(
          `inventory-item-${item.uuid}.json`,
          JSON.stringify(
            decamelizeKeys(item, { separator: '-', deep: true }),
            null,
            2,
          ),
        ),
    },
    {
      label: 'Delete item',
      icon: 'delete',
      tone: 'danger',
      disabledReason: notOwn,
      onSelect: () => (deleting.value = item),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="Inventory"
    description="System inventory from every source."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="
          can(RESOURCES.INVENTORY, ACTIONS.CREATE)
            ? undefined
            : 'Your access doesn\'t include adding inventory.'
        "
        @click="creating = true"
        >New item</Button
      >
    </template>
    <template #filters>
      <FilterBar
        label="Filter inventory"
        :chips="chips"
        :summary="
          items.status.value === 'ready' || items.status.value === 'empty'
            ? `${plural(rows.length, 'item')}.`
            : ''
        "
        @remove="clearFilters"
        @clear="clearFilters"
      >
        <CheckboxGroup v-model="sources" legend="Sources" :options="SOURCES" />
        <FormField label="Asset type">
          <Select v-model="type" :options="TYPES" />
        </FormField>
      </FilterBar>
    </template>

    <DataState
      :status="items.status.value"
      subject="inventory"
      empty-title="No inventory items"
      empty-body="Nothing matches these sources and type. Inventory comes from security plans, evidence, POA&Ms and assessments."
      icon="details"
      :filters="chips.map((c) => c.label)"
      @retry="items.retry"
      @clear-filters="clearFilters"
    >
      <DataTable
        :caption="plural(rows.length, 'inventory item')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-assetType="{ row: r }"
          ><Tag :label="r.assetType"
        /></template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="actions(r.item)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <Drawer
    v-model:open="viewOpen"
    :title="viewing ? assetId(viewing) || 'Inventory item' : 'Inventory item'"
  >
    <DescriptionList :items="details" layout="stacked" />
  </Drawer>
  <Dialog v-model:open="creating" title="New inventory item" size="l">
    <InventoryItemCreateForm
      v-if="creating"
      :ssp-id="sspId"
      @cancel="creating = false"
      @created="done(() => (creating = false), 'Item added')"
    />
  </Dialog>
  <Dialog v-model:open="editOpen" title="Edit inventory item">
    <InventoryItemEditForm
      v-if="editing"
      :ssp-id="editing.sourceId || sspId!"
      :inventory-item="editing"
      @cancel="editing = undefined"
      @saved="done(() => (editing = undefined), 'Item saved')"
    />
  </Dialog>
  <Dialog v-model:open="attachOpen" title="Attach to components" size="l">
    <InventoryItemRelationsForm
      v-if="attaching"
      :ssp-id="attaching.sourceId || sspId!"
      :item="attaching"
      @cancel="attaching = undefined"
      @saved="done(() => (attaching = undefined), 'Item saved')"
    />
  </Dialog>
  <ConfirmDialog
    v-model:open="deleteOpen"
    :title="`Delete ${deleting ? assetId(deleting) || 'this item' : 'this item'}?`"
    confirm-label="Delete item"
    @confirm="remove"
    ><Text
      >It is removed from this system's security plan. This can't be
      undone.</Text
    ></ConfirmDialog
  >
</template>
