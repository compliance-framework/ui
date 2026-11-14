<script setup lang="ts">
/**
 * A workflow definition's Controls tab: the controls it's linked to, so people implementing
 * those controls can find it. Link a control by choosing a catalog and a control (filterable);
 * Unlink confirms. The script is the classic page's; the template and the helpers at the end are
 * new.
 */
import { ref, onMounted, computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useControlRelationships } from '@/composables/workflows';
import { useDataApi } from '@/composables/axios';
import { useControlOptions } from '@/composables/useControlOptions';
import type { ControlRelationship } from '@/types/workflows';
import type { Catalog } from '@/oscal';
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const denied = (action: string, verb: string) =>
  can(RESOURCES.CONTROL_RELATIONSHIP, action)
    ? undefined
    : `Your access doesn't include ${verb} control links.`;

const store = useWorkflowDefinitionStore();
const {
  relationships,
  listRelationships,
  createRelationship,
  deleteRelationship,
} = useControlRelationships();

const loading = ref(false);
const showLinkDialog = ref(false);
const selectedCatalogId = ref<string | null>(null);
const selectedControlId = ref<string | null>(null);
const isLinking = ref(false);
const linkError = ref('');

// Catalogs list
const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
// Every control in the chosen catalog, root-level ones included (the classic picker walked only
// groups, so catalogs whose controls sit at the root offered nothing).
const { options: controlOptions } = useControlOptions(
  () => selectedCatalogId.value,
);

async function loadRelationships() {
  if (!store.definition) return;

  loading.value = true;
  try {
    await listRelationships({
      workflowDefinitionId: store.definition.id,
    });
  } finally {
    loading.value = false;
  }
}

function onCatalogChange() {
  selectedControlId.value = null;
}

async function handleLink() {
  if (!store.definition || !selectedCatalogId.value || !selectedControlId.value)
    return;

  isLinking.value = true;
  linkError.value = '';

  try {
    await createRelationship(
      {
        workflowDefinitionId: store.definition.id,
        catalogId: selectedCatalogId.value,
        controlId: selectedControlId.value || '',
      },
      () => {
        closeLinkDialog();
        loadRelationships();
      },
    );
  } catch (error) {
    linkError.value =
      error instanceof Error ? error.message : 'Failed to link control';
  } finally {
    isLinking.value = false;
  }
}

async function handleUnlink(rel: ControlRelationship) {
  await deleteRelationship(rel.id, rel.controlTitle, () => {
    loadRelationships();
  });
}

function closeLinkDialog() {
  showLinkDialog.value = false;
  selectedCatalogId.value = null;
  selectedControlId.value = null;
  linkError.value = '';
}

onMounted(() => {
  loadRelationships();
});

// Design-system view ---------------------------------------------------------------------------

const catalogOptions = computed(() =>
  (catalogs.value ?? [])
    .map((c) => ({ value: c.uuid, label: c.metadata?.title ?? c.uuid }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
const catalogModel = computed({
  get: () => selectedCatalogId.value ?? '',
  set: (value: string) => {
    selectedCatalogId.value = value || null;
    onCatalogChange();
  },
});
const controlModel = computed({
  get: () => selectedControlId.value ?? '',
  set: (value: string) => {
    selectedControlId.value = value || null;
  },
});
const dialogOpen = computed({
  get: () => showLinkDialog.value,
  set: (open: boolean) => {
    if (!open) closeLinkDialog();
  },
});
const linkDenied = computed(
  () =>
    denied(ACTIONS.CREATE, 'creating') ??
    (!selectedCatalogId.value || !selectedControlId.value
      ? 'Choose a catalog and a control first.'
      : undefined),
);
function rowActions(rel: ControlRelationship): MenuEntry[] {
  return [
    {
      label: 'Unlink',
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied(ACTIONS.DELETE, 'removing'),
      onSelect: () => void handleUnlink(rel),
    },
  ];
}
</script>

<template>
  <Stack v-if="store.definition" gap="5">
    <div>
      <Button
        variant="primary"
        icon="link"
        :disabled-reason="denied(ACTIONS.CREATE, 'creating')"
        @click="showLinkDialog = true"
        >Link control</Button
      >
    </div>
    <Text v-if="loading" variant="caption">Loading linked controls…</Text>
    <Text v-else-if="!relationships?.length"
      >No controls linked yet. Link controls so people implementing them can
      find this workflow.</Text
    >
    <DataTable
      v-else
      :caption="plural(relationships.length, 'linked control')"
      caption-hidden
      :columns="[
        { key: 'control', label: 'Control', minWidth: 'md' },
        { key: 'catalog', label: 'Catalog' },
      ]"
      :rows="relationships"
      :row-key="(r) => r.id"
    >
      <template #cell-control="{ row: rel }">
        <Stack gap="1">
          <Text as="span" variant="label">{{ rel.controlId }}</Text>
          <Text v-if="rel.controlTitle" as="span">{{ rel.controlTitle }}</Text>
        </Stack>
      </template>
      <template #cell-catalog="{ row: rel }">{{
        catalogOptions.find((c) => c.value === rel.catalogId)?.label ??
        rel.controlSource ??
        rel.catalogId
      }}</template>
      <template #actions="{ row: rel }">
        <Menu
          :label="`Actions for ${rel.controlId}`"
          :items="rowActions(rel)"
        />
      </template>
    </DataTable>

    <Dialog
      v-model:open="dialogOpen"
      title="Link a control"
      description="Choose the catalog, then the control."
      :dirty="Boolean(selectedCatalogId)"
    >
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="handleLink">
          <Stack gap="4">
            <FormField label="Catalog" required>
              <Combobox
                v-model="catalogModel"
                :options="catalogOptions"
                placeholder="Type to find a catalog"
              />
            </FormField>
            <FormField v-if="selectedCatalogId" label="Control" required>
              <Combobox
                v-model="controlModel"
                :options="controlOptions"
                placeholder="Type a control ID or title"
              />
            </FormField>
            <InlineMessage v-if="linkError" tone="error" title="Not linked">
              <p>{{ linkError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                :loading="isLinking"
                :disabled-reason="linkDenied"
                >Link control</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
  </Stack>
</template>
