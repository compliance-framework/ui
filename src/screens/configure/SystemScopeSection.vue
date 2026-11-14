<script setup lang="ts">
/**
 * Configure System → Scope: the label sets that decide which evidence belongs to this system,
 * the exceptions removed from it, and automatic per-policy filters. The label builder is a
 * classic island. The script is the classic ScopePanel's.
 */
import { computed, ref, toRef, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import LabelConditionBuilder from '@/views/dashboard/partials/LabelConditionBuilder.vue';
import {
  buildDashboardSuggestionLabelKeysEndpoint,
  type DashboardSuggestionLabelKey,
  type LabelConditionRow,
} from '@/views/dashboard/partials/dashboard-suggestions';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import { formatDate as formatDay, plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useSspScope } from '@/composables/useSspScope';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import type { DataResponse } from '@/stores/types';
import type { ScopeEntry, ScopeException, ScopeLabel } from '@/types/ssp-scope';

const props = defineProps<{ sspId: string }>();

const { can } = usePermissions();
const confirm = useConfirm();
const toast = useToast();
const api = useAuthenticatedInstance();

const { scope, load, addEntry, addException, deleteException, setAutoFilters } =
  useSspScope(toRef(props, 'sspId'));

const canUpdate = computed(() => can(RESOURCES.SSP, ACTIONS.UPDATE));
const entries = computed(() => scope.value?.entries ?? []);
const exceptions = computed(() => scope.value?.exceptions ?? []);

const saving = ref(false);
const labelKeys = ref<string[]>([]);
const newEntry = ref<LabelConditionRow[]>([{ key: '', value: '' }]);
const newEntryLabels = computed<ScopeLabel[]>(() =>
  newEntry.value
    .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
    .filter((row) => row.key && row.value),
);

const formatDate = (value?: string) => (value ? formatDay(value) : 'Not known');

// A new entry is by definition not in the scope yet, so its key suggestions come from
// all evidence (`ignoreScope=true`), not from the scope-restricted pickers.
async function loadLabelKeys() {
  if (!props.sspId) return;
  try {
    const response = await api.get<DataResponse<DashboardSuggestionLabelKey[]>>(
      buildDashboardSuggestionLabelKeysEndpoint(props.sspId),
      { params: { ignoreScope: true } },
    );
    labelKeys.value = (response.data.data ?? []).map((entry) => entry.key);
  } catch {
    labelKeys.value = [];
  }
}

async function showError(summary: string, error: unknown) {
  toast.add({
    severity: 'error',
    summary,
    detail: await getErrorDetail(error, 'The request failed.'),
    life: 5000,
  });
}

async function run(summary: string, action: () => Promise<unknown>) {
  saving.value = true;
  try {
    await action();
    return true;
  } catch (error) {
    await showError(summary, error);
    return false;
  } finally {
    saving.value = false;
  }
}

async function refresh() {
  try {
    await load();
  } catch (error) {
    await showError('Failed to load scope', error);
  }
}

async function onAddEntry() {
  const ok = await run('Failed to add entry', () =>
    addEntry(newEntryLabels.value),
  );
  if (ok) {
    newEntry.value = [{ key: '', value: '' }];
  }
}

function describeLabels(labels: ScopeLabel[]): string {
  return labels.map((label) => `${label.key}=${label.value}`).join(' AND ');
}

function confirmRemoveEntry(entry: ScopeEntry) {
  confirm.require({
    header: 'Remove from scope',
    message:
      `Remove ${describeLabels(entry.labels)} from the scope? This adds an ` +
      'exception for it, so templates will not learn it again.',
    rejectProps: { label: 'Cancel' },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: () =>
      run('Failed to remove entry', () => addException(entry.labels)),
  });
}

async function onDeleteException(exception: ScopeException) {
  await run('Failed to delete exception', () => deleteException(exception.id));
}

/** Saves on change; a failed save leaves the box as it was. */
const autoFilters = computed({
  get: () => scope.value?.autoFilters ?? false,
  set: (enabled: boolean) =>
    void run('Failed to update automatic filters', () =>
      setAutoFilters(enabled),
    ),
});

watch(
  () => props.sspId,
  () => {
    refresh();
    loadLabelKeys();
  },
  { immediate: true },
);

// Design-system view ---------------------------------------------------------------------------

const denied = computed(() =>
  canUpdate.value
    ? saving.value
      ? 'Saving…'
      : undefined
    : "Your access doesn't include changing this system.",
);
const addDenied = computed(
  () =>
    denied.value ??
    (newEntryLabels.value.length === 0
      ? 'Add at least one complete label first.'
      : undefined),
);
function entryActions(entry: ScopeEntry): MenuEntry[] {
  return [
    {
      label: 'Remove from scope',
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied.value,
      onSelect: () => confirmRemoveEntry(entry),
    },
  ];
}
function exceptionActions(exception: ScopeException): MenuEntry[] {
  return [
    {
      label: 'Delete exception',
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied.value,
      onSelect: () => void onDeleteException(exception),
    },
  ];
}
</script>

<template>
  <Stack gap="5">
    <Panel
      title="Scope"
      description="The labels that identify this system's evidence. Evidence is in scope when it matches any entry, and matches an entry when it has all of the entry's labels."
      :level="2"
    >
      <Checkbox
        v-model="autoFilters"
        data-testid="scope-auto-filters"
        label="Automatic filters"
        description="Create one filter for each policy found in this system's evidence, ready to link to controls on Implementation."
        :disabled-reason="scope ? denied : 'Loading the scope…'"
      />
    </Panel>

    <Panel title="Entries" :level="2">
      <Stack gap="4">
        <Text v-if="scope && entries.length === 0" data-testid="scope-empty"
          >No entries yet. This system's evidence isn't defined until you add
          one.</Text
        >
        <DataTable
          v-else-if="entries.length > 0"
          :caption="plural(entries.length, 'scope entry', 'scope entries')"
          caption-hidden
          :columns="[
            { key: 'labels', label: 'Labels', minWidth: 'md' },
            { key: 'origin', label: 'Origin', nowrap: true },
            { key: 'created', label: 'Created', nowrap: true },
          ]"
          :rows="entries"
          :row-key="(r) => r.id"
        >
          <template #cell-labels="{ row: entry }">
            <Cluster gap="1" data-testid="scope-entry">
              <template v-for="(label, i) in entry.labels" :key="label.key">
                <Text v-if="i > 0" as="span" variant="caption">AND</Text>
                <Tag :label="`${label.key}=${label.value}`" />
              </template>
            </Cluster>
          </template>
          <template #cell-origin="{ row: entry }">
            <Tag :label="entry.origin === 'template' ? 'Template' : 'Manual'" />
          </template>
          <template #cell-created="{ row: entry }">{{
            formatDate(entry.createdAt)
          }}</template>
          <template #actions="{ row: entry }">
            <Menu
              :label="`Actions for ${describeLabels(entry.labels)}`"
              :items="entryActions(entry)"
            />
          </template>
        </DataTable>

        <Stack gap="2">
          <Text variant="label">Add an entry</Text>
          <Text variant="caption"
            >Evidence must have all of these labels to match the entry.</Text
          >
          <LegacyPage>
            <LabelConditionBuilder
              v-model="newEntry"
              :ssp-id="sspId"
              :keys="labelKeys"
              :ignore-scope="true"
              add-label="Add label"
              testid="scope-new-label"
            />
          </LegacyPage>
          <div>
            <Button
              variant="primary"
              icon="add"
              data-testid="scope-add-entry"
              :disabled-reason="addDenied"
              @click="onAddEntry"
              >Add entry</Button
            >
          </div>
        </Stack>
      </Stack>
    </Panel>

    <Panel
      title="Exceptions"
      description="Entries removed from the scope. Templates don't learn an entry that has an exception; deleting the exception doesn't add the entry back, but lets templates learn it again."
      :level="2"
    >
      <Text v-if="exceptions.length === 0">No exceptions.</Text>
      <DataTable
        v-else
        :caption="plural(exceptions.length, 'exception')"
        caption-hidden
        :columns="[
          { key: 'labels', label: 'Labels', minWidth: 'md' },
          { key: 'created', label: 'Created', nowrap: true },
        ]"
        :rows="exceptions"
        :row-key="(r) => r.id"
      >
        <template #cell-labels="{ row: exception }">
          <Cluster gap="1" data-testid="scope-exception">
            <template v-for="(label, i) in exception.labels" :key="label.key">
              <Text v-if="i > 0" as="span" variant="caption">AND</Text>
              <Tag :label="`${label.key}=${label.value}`" />
            </template>
          </Cluster>
        </template>
        <template #cell-created="{ row: exception }">{{
          formatDate(exception.createdAt)
        }}</template>
        <template #actions="{ row: exception }">
          <Menu
            :label="`Actions for ${describeLabels(exception.labels)}`"
            :items="exceptionActions(exception)"
          />
        </template>
      </DataTable>
    </Panel>
  </Stack>
</template>
