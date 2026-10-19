<template>
  <div class="flex flex-col gap-6">
    <PageCard>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-200">
        Scope
      </h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
        The labels that identify this system's evidence. Evidence is in scope
        when it matches any entry, and matches an entry when it has all of the
        entry's labels.
      </p>

      <label
        class="mt-4 flex items-start gap-3 text-sm text-gray-800 dark:text-slate-300"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
          disabled: canUpdate,
        }"
      >
        <input
          type="checkbox"
          class="mt-1"
          data-testid="scope-auto-filters"
          :checked="scope?.autoFilters ?? false"
          :disabled="!canUpdate || saving || !scope"
          @change="onToggleAutoFilters"
        />
        <span>
          <span class="font-medium">Automatic filters</span>
          <span class="block text-gray-600 dark:text-slate-400">
            Create one filter for each policy found in this system's evidence,
            ready to link to controls on the Implementations page.
          </span>
        </span>
      </label>
    </PageCard>

    <PageCard>
      <h3 class="text-base font-semibold text-gray-900 dark:text-slate-200">
        Entries
      </h3>
      <p
        v-if="scope && entries.length === 0"
        class="mt-2 text-sm text-gray-600 dark:text-slate-400"
        data-testid="scope-empty"
      >
        No entries yet. This system's evidence is not defined until you add one.
      </p>
      <table v-else-if="entries.length > 0" class="mt-3 w-full text-sm">
        <thead>
          <tr
            class="text-left text-gray-600 dark:text-slate-400 border-b border-ccf-300 dark:border-slate-700"
          >
            <th class="py-2 pr-4 font-medium">Labels</th>
            <th class="py-2 pr-4 font-medium">Origin</th>
            <th class="py-2 pr-4 font-medium">Created</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in entries"
            :key="entry.id"
            class="border-b border-ccf-300 dark:border-slate-700 last:border-0"
            data-testid="scope-entry"
          >
            <td class="py-2 pr-4">
              <span class="flex flex-wrap items-center gap-1">
                <template v-for="(label, i) in entry.labels" :key="label.key">
                  <span
                    v-if="i > 0"
                    class="text-xs text-gray-500 dark:text-slate-400"
                    >AND</span
                  >
                  <Chip :label="`${label.key}=${label.value}`" />
                </template>
              </span>
            </td>
            <td class="py-2 pr-4">
              <Badge
                :value="entry.origin === 'template' ? 'Template' : 'Manual'"
                :severity="entry.origin === 'template' ? 'info' : 'secondary'"
              />
            </td>
            <td class="py-2 pr-4 text-gray-700 dark:text-slate-300">
              {{ formatDate(entry.createdAt) }}
            </td>
            <td class="py-2 text-right">
              <SecondaryButton
                type="button"
                data-testid="scope-remove-entry"
                :disabled="!canUpdate || saving"
                v-tooltip.top="{
                  value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
                  disabled: canUpdate,
                }"
                @click="confirmRemoveEntry(entry)"
              >
                Remove from scope
              </SecondaryButton>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="mt-6">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Add entry
        </h4>
        <p class="mt-1 mb-3 text-sm text-gray-600 dark:text-slate-400">
          Evidence must have all of these labels to match the entry.
        </p>
        <LabelConditionBuilder
          v-model="newEntry"
          :ssp-id="sspId"
          :keys="labelKeys"
          :ignore-scope="true"
          add-label="Add label"
          testid="scope-new-label"
        />
        <PrimaryButton
          type="button"
          class="mt-3"
          data-testid="scope-add-entry"
          :disabled="!canUpdate || saving || newEntryLabels.length === 0"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
            disabled: canUpdate,
          }"
          @click="onAddEntry"
        >
          Add entry
        </PrimaryButton>
      </div>
    </PageCard>

    <PageCard>
      <h3 class="text-base font-semibold text-gray-900 dark:text-slate-200">
        Exceptions
      </h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
        Entries removed from the scope. Templates do not learn an entry that has
        an exception. Deleting an exception does not add the entry back, but
        lets templates learn it again.
      </p>
      <p
        v-if="exceptions.length === 0"
        class="mt-2 text-sm text-gray-600 dark:text-slate-400"
      >
        No exceptions.
      </p>
      <table v-else class="mt-3 w-full text-sm">
        <thead>
          <tr
            class="text-left text-gray-600 dark:text-slate-400 border-b border-ccf-300 dark:border-slate-700"
          >
            <th class="py-2 pr-4 font-medium">Labels</th>
            <th class="py-2 pr-4 font-medium">Created</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="exception in exceptions"
            :key="exception.id"
            class="border-b border-ccf-300 dark:border-slate-700 last:border-0"
            data-testid="scope-exception"
          >
            <td class="py-2 pr-4">
              <span class="flex flex-wrap items-center gap-1">
                <template
                  v-for="(label, i) in exception.labels"
                  :key="label.key"
                >
                  <span
                    v-if="i > 0"
                    class="text-xs text-gray-500 dark:text-slate-400"
                    >AND</span
                  >
                  <Chip :label="`${label.key}=${label.value}`" />
                </template>
              </span>
            </td>
            <td class="py-2 pr-4 text-gray-700 dark:text-slate-300">
              {{ formatDate(exception.createdAt) }}
            </td>
            <td class="py-2 text-right">
              <SecondaryButton
                type="button"
                data-testid="scope-delete-exception"
                :disabled="!canUpdate || saving"
                v-tooltip.top="{
                  value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
                  disabled: canUpdate,
                }"
                @click="onDeleteException(exception)"
              >
                Delete exception
              </SecondaryButton>
            </td>
          </tr>
        </tbody>
      </table>
    </PageCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import PageCard from '@/components/PageCard.vue';
import LabelConditionBuilder from '@/views/dashboard/partials/LabelConditionBuilder.vue';
import {
  buildDashboardSuggestionLabelKeysEndpoint,
  type LabelConditionRow,
} from '@/views/dashboard/partials/dashboard-suggestions';
import Badge from '@/volt/Badge.vue';
import Chip from '@/volt/Chip.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useSspScope } from '@/composables/useSspScope';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import type { DataResponse } from '@/stores/types';
import type { ScopeEntry, ScopeException, ScopeLabel } from '@/types/ssp-scope';

const props = defineProps<{ sspId: string }>();

const { can, permissionTooltip } = usePermissions();
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

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString() : '';
}

// A new entry is by definition not in the scope yet, so its key suggestions come from
// all evidence (`ignoreScope=true`), not from the scope-restricted pickers.
async function loadLabelKeys() {
  if (!props.sspId) return;
  try {
    const response = await api.get<DataResponse<string[]>>(
      buildDashboardSuggestionLabelKeysEndpoint(props.sspId),
      { params: { ignoreScope: true } },
    );
    labelKeys.value = response.data.data ?? [];
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

async function onToggleAutoFilters(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  const ok = await run('Failed to update automatic filters', () =>
    setAutoFilters(enabled),
  );
  if (!ok) {
    (event.target as HTMLInputElement).checked = !enabled;
  }
}

watch(
  () => props.sspId,
  () => {
    refresh();
    loadLabelKeys();
  },
  { immediate: true },
);
</script>
