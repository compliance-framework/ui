<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { ACTIONS } from '@/constants/permissions';
import type { AssessmentPlan, AssessmentResult, POAM } from '@/oscal';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import { downloadJson } from '@/utils/download-json';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import { DOCUMENT_LISTS } from './documentKinds';

/**
 * One list screen for the OSCAL document types in documentKinds.ts (component definitions,
 * profiles, assessment plans and results, POA&Ms). Title search and sort live in the URL; each
 * row keeps its classic actions: open, download the full document, and, where the type has one,
 * make it the active document. DocumentLists.vue picks the type from the route.
 */
interface DocumentSummary {
  uuid: string;
  metadata: { title: string; version?: string; lastModified?: string };
}

type Row = {
  id: string;
  title: string;
  version: string;
  lastModified: string;
  document: DocumentSummary;
};

const props = defineProps<{ kind: string }>();

const toast = useToast();
const permissions = usePermissionsStore();
const systemStore = useSystemStore();

const config = DOCUMENT_LISTS[props.kind]!;

const view = useListView(
  ['title', 'version', 'lastModified'] as const,
  'title',
);
const { q, draft, chips, chipLabels, sort } = view;

// Results ------------------------------------------------------------------------------------

const documents = useApiQuery<DocumentSummary[]>(config.endpoint);

const rows = computed<Row[]>(() =>
  view.sortRows(
    (documents.data.value ?? [])
      .filter((d) => matches(q.value, d.metadata.title))
      .map((d) => ({
        id: d.uuid,
        title: d.metadata.title,
        version: d.metadata.version ?? '',
        lastModified: d.metadata.lastModified ?? '',
        document: d,
      })),
    'title',
  ),
);

/** A successful empty list is first use; empty under a search is filtered-empty. */
const status = computed(() =>
  documents.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : documents.status.value,
);

const summary = computed(() => {
  if (!q.value) return '';
  if (status.value === 'empty') return 'Nothing matches.';
  return status.value === 'ready'
    ? `${plural(rows.value.length, 'match', 'matches')}.`
    : '';
});

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true, minWidth: 'sm' },
  { key: 'version', label: 'Version', sortable: true, nowrap: true },
  {
    key: 'lastModified',
    label: 'Last modified',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];

const createDenied = computed(() =>
  permissions.can(config.resource, ACTIONS.CREATE)
    ? undefined
    : `Your access doesn't include creating ${config.subject}.`,
);

// Row actions --------------------------------------------------------------------------------

const activeId = computed(() =>
  config.active ? systemStore.system[config.active]?.uuid : undefined,
);

const { data: fullDocument, execute: fetchFull } = useDataApi<object>(
  null,
  null,
  { immediate: false },
);

async function downloadSource(row: Row): Promise<void> {
  if (!config.fullEndpoint) return;
  try {
    await fetchFull(config.fullEndpoint(row.id));
    downloadJson(
      `${row.title.replace(/[^a-zA-Z0-9]/g, '_')}-${config.fileSuffix}.json`,
      fullDocument.value!,
    );
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Download failed',
      detail: `We couldn't download the source of ${row.title}. Try again.`,
      life: 4000,
    });
  }
}

/** The list endpoints return enough of each document for the store, as the classic lists did. */
function makeActive(document: DocumentSummary): void {
  if (config.active === 'assessmentPlan')
    systemStore.setAssessmentPlan(document as AssessmentPlan);
  if (config.active === 'assessmentResults')
    systemStore.setAssessmentResults(document as AssessmentResult);
  if (config.active === 'poam') systemStore.setPoam(document as POAM);
}

function rowActions(row: Row): MenuEntry[] {
  const entries: MenuEntry[] = [];
  if (config.active)
    entries.push({
      label: 'Make active',
      icon: 'check',
      disabledReason:
        activeId.value === row.id
          ? 'This is already the active one.'
          : undefined,
      onSelect: () => makeActive(row.document),
    });
  if (config.fullEndpoint)
    entries.push({
      label: 'Download source (JSON)',
      icon: 'download',
      onSelect: () => void downloadSource(row),
    });
  return entries;
}
</script>

<template>
  <ListTemplate :title="config.title" :description="config.description">
    <template #actions>
      <Button
        v-for="link in config.links"
        :key="link.route"
        :to="{ name: link.route }"
        >{{ link.label }}</Button
      >
      <Button
        variant="primary"
        icon="add"
        :to="createDenied ? undefined : { name: config.createRoute }"
        :disabled-reason="createDenied"
        >{{ config.createLabel }}</Button
      >
    </template>

    <template #filters>
      <FilterBar
        v-model:query="draft"
        :label="`Filter ${config.subject}`"
        :search-label="`Search ${config.subject}`"
        search-placeholder="Title"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      :subject="config.subject"
      :empty-title="`No ${config.subject} yet`"
      :empty-body="config.emptyBody"
      :icon="config.icon"
      :filters="chipLabels"
      @retry="documents.retry"
      @clear-filters="view.clearSearch()"
    >
      <template #empty-actions>
        <Button
          variant="primary"
          icon="add"
          :to="createDenied ? undefined : { name: config.createRoute }"
          :disabled-reason="createDenied"
          >{{ config.createLabel }}</Button
        >
      </template>

      <DataTable
        v-model:sort="sort"
        :caption="`${plural(rows.length, config.singular, config.subject)}`"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }">
          <Cluster gap="2">
            <TextLink
              :to="{ name: config.detailRoute, params: { id: r.id } }"
              >{{ r.title }}</TextLink
            >
            <Tag v-if="activeId === r.id" label="Active" />
          </Cluster>
        </template>
        <template #cell-version="{ row: r }">{{
          r.version || 'Not set'
        }}</template>
        <template #cell-lastModified="{ row: r }">{{
          r.lastModified ? formatDate(r.lastModified) : 'Not set'
        }}</template>
        <template
          v-if="config.active || config.fullEndpoint"
          #actions="{ row: r }"
        >
          <Menu :label="`Actions for ${r.title}`" :items="rowActions(r)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>
</template>
