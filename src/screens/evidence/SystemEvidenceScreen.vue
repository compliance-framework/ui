<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { sspHasScopeEntries } from '@/composables/useSspScope';
import { useConfigStore } from '@/stores/config';
import type { Evidence } from '@/stores/evidence';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import type { PaginatedListResponse } from '@/stores/types';
import { buildEvidenceCsv, downloadCsv } from '@/utils/evidence-csv';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';
import { formatLocalDateTime, plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type {
  DataTableColumn,
  DataTableSort,
} from '@/ds/components/DataTable/types';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Pagination from '@/ds/components/Pagination/Pagination.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import EvidenceTrends from './EvidenceTrends.vue';
import SubjectFilterField from './SubjectFilterField.vue';
import {
  EVIDENCE_PAGE_SIZE,
  isLabelQuery,
  readView,
  searchError,
  searchRequest,
  viewQuery,
  type EvidenceView,
} from './evidenceView';

/**
 * This System > Evidence: the system's in-scope evidence, through the SSP's scoped search. The
 * system comes from the URL (SystemScope makes it current). Search, subject, sort and page live in
 * the URL under the classic page's parameter names, so old links still open the same view. It
 * has the classic page's tools: status and agent-health trends, CSV export, save as filter, the
 * subject filter and the labels column. A system with no scope entries asks for a scope rather
 * than listing nothing.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const systemStore = useSystemStore();
const configStore = useConfigStore();
const permissions = usePermissionsStore();

const systemId = String(route.params.systemId);
const base = `/api/oscal/system-security-plans/${systemId}`;
const systemName = computed(
  () => systemStore.system.securityPlan?.metadata.title ?? 'this system',
);

const view = computed(() => readView(route.query));

/** The current query with the view replaced, keeping anything else in it. */
function withView(next: EvidenceView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of ['filter', 'page', 'sortBy', 'sortDirection', 'subject'])
    delete query[key];
  return { ...query, ...viewQuery(next) };
}

/** Each change is a history entry, so Back undoes it. A new search or sort starts at page 1. */
function go(patch: Partial<EvidenceView>): void {
  void router.push({
    query: withView({ ...view.value, page: 1, ...patch }),
  });
}

// Search -------------------------------------------------------------------------------------

const draft = ref(view.value.filter);
const draftError = ref<string>();
watch(
  () => view.value.filter,
  (filter) => {
    draft.value = filter;
    draftError.value = undefined;
  },
);

function search(): void {
  draftError.value = searchError(draft.value);
  if (!draftError.value) go({ filter: draft.value.trim() });
}

const subjectName = ref('…');
const subject = computed({
  get: () => view.value.subject,
  set: (uuid: string) => go({ subject: uuid }),
});

const chips = computed(() => [
  ...(view.value.filter
    ? [{ label: `Search: ${view.value.filter}`, remove: { filter: '' } }]
    : []),
  ...(view.value.subject
    ? [{ label: `Subject: ${subjectName.value}`, remove: { subject: '' } }]
    : []),
]);
const chipLabels = computed(() => chips.value.map((chip) => chip.label));

function clearFilters(): void {
  go({ filter: '', subject: '' });
}

// Scope and results --------------------------------------------------------------------------

const hasScope = ref<boolean>();
const status = ref<QueryStatus>('loading');
const errorMessage = ref<string>();
const evidence = ref<Evidence[]>([]);
const total = ref(0);
const pageCount = ref(1);
let latest = 0;

async function load(): Promise<void> {
  const request = ++latest;
  status.value = 'loading';
  try {
    if (hasScope.value === undefined) {
      hasScope.value = await sspHasScopeEntries(api, systemId);
    }
    if (!hasScope.value) return;
    // A URL edited by hand can hold a query that doesn't parse; show it as an error.
    const invalid = searchError(view.value.filter);
    if (invalid) {
      if (request !== latest) return;
      errorMessage.value = invalid;
      status.value = 'error';
      return;
    }
    const { params, body } = searchRequest(view.value);
    const response = await api.post<PaginatedListResponse<Evidence>>(
      `${base}/evidence/search`,
      body,
      { params },
    );
    if (request !== latest) return;
    evidence.value = response.data.data ?? [];
    total.value = response.data.total ?? 0;
    pageCount.value = Math.max(response.data.totalPages ?? 1, 1);
    status.value = evidence.value.length ? 'ready' : 'empty';
  } catch (error) {
    if (request !== latest) return;
    if (getErrorStatus(error) === 403) {
      status.value = 'forbidden';
      return;
    }
    errorMessage.value = await getErrorDetail(
      error,
      "We couldn't load this system's evidence. Try again.",
    );
    status.value = 'error';
  }
}

watch(
  () => JSON.stringify(viewQuery(view.value)),
  () => void load(),
  { immediate: true },
);

// Table --------------------------------------------------------------------------------------

const SUBJECT_PREVIEW = 3;

/** Shared with the classic page's Labels toggle. System labels (`_policy`…) are opt-in. */
const showLabels = computed({
  get: () => configStore.showLabels,
  set: (value: boolean) => (configStore.showLabels = value),
});
const showSystemLabels = ref(false);

const rows = computed(() =>
  evidence.value.map((item) => ({
    id: item.id,
    status: item.status?.state?.toLowerCase() ?? 'unknown',
    name: item.title,
    subjects: item.subjectReferences,
    labels: (item.labels ?? []).filter(
      (label) => showSystemLabels.value || !label.name.startsWith('_'),
    ),
    lastSeenAt: item.end,
  })),
);
const showSubjects = computed(() =>
  evidence.value.some((item) => item.subjectReferences !== undefined),
);

const columns = computed<DataTableColumn[]>(() => [
  { key: 'status', label: 'Status', sortable: true, nowrap: true },
  { key: 'name', label: 'Evidence', sortable: true, minWidth: 'md' },
  ...(showSubjects.value
    ? [{ key: 'subjects', label: 'Subjects', minWidth: 'sm' as const }]
    : []),
  {
    key: 'lastSeenAt',
    label: 'Last seen',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
  ...(showLabels.value
    ? [{ key: 'labels', label: 'Labels', minWidth: 'md' as const }]
    : []),
]);

const sort = computed<DataTableSort>({
  get: (): DataTableSort => ({
    key: view.value.sortBy,
    direction: view.value.sortDirection === 'asc' ? 'ascending' : 'descending',
  }),
  set: (next: DataTableSort) =>
    go({
      sortBy: next.key as EvidenceView['sortBy'],
      sortDirection: next.direction === 'ascending' ? 'asc' : 'desc',
    }),
});

const caption = computed(
  () =>
    `${plural(total.value, 'evidence item')} in scope for ${systemName.value}`,
);
/** The count shows only while the list is narrowed. */
const summary = computed(() => {
  if (!chips.value.length) return '';
  if (status.value === 'empty') return 'No evidence matches.';
  return status.value === 'ready'
    ? `${plural(total.value, 'evidence item')} match.`
    : '';
});
const showingLabel = computed(() => {
  const start = (view.value.page - 1) * EVIDENCE_PAGE_SIZE + 1;
  const end = Math.min(view.value.page * EVIDENCE_PAGE_SIZE, total.value);
  return `Showing ${start}–${end} of ${total.value}`;
});

function pageLink(page: number) {
  return { query: withView({ ...view.value, page }) };
}

/** Evidence opens in place; the list's view travels along so the breadcrumb returns to it. */
function evidenceLink(id: string) {
  return {
    name: 'system-evidence-record',
    params: { systemId, evidenceId: id },
    query: viewQuery(view.value),
  };
}

const subjectTitle = (subject: { title?: string; subjectUuid: string }) =>
  subject.title || subject.subjectUuid;

// Actions ------------------------------------------------------------------------------------

async function share(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.add({
      severity: 'success',
      summary: 'Link copied',
      detail: 'Anyone with access to this system can open this view.',
      life: 3000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: "Couldn't copy the link",
      detail: 'Copy it from the address bar instead.',
      life: 4000,
    });
  }
}

/** Saving opens the classic "new evidence filter" page with this search and system. */
const saveDenied = computed(() => {
  if (!permissions.can(RESOURCES.FILTER, ACTIONS.CREATE))
    return "Your access doesn't include saving filters.";
  if (draft.value.trim() !== view.value.filter || draftError.value)
    return 'Apply the search before saving it as a filter.';
  return undefined;
});
const saveLink = computed(() => ({
  name: 'dashboards.create',
  query: { filter: view.value.filter || undefined, sspId: systemId },
}));

// Export: every row of the applied search, fetched page by page, as the classic page does.
const EXPORT_PAGE_SIZE = 100;
const EXPORT_CONFIRM_ABOVE = 1000;
const EXPORT_MAX = 5000;
const exporting = ref(false);
const confirmExport = ref(false);

const exportDenied = computed(() => {
  if (status.value !== 'ready') return 'There is no evidence to export.';
  if (total.value > EXPORT_MAX)
    return `Exports are limited to ${EXPORT_MAX} items. Narrow the search first.`;
  return undefined;
});

function beginExport(): void {
  if (total.value > EXPORT_CONFIRM_ABOVE) confirmExport.value = true;
  else void runExport();
}

async function runExport(): Promise<void> {
  confirmExport.value = false;
  exporting.value = true;
  try {
    const rows: Evidence[] = [];
    let page = 1;
    let pages = 1;
    do {
      const { params, body } = searchRequest({ ...view.value, page });
      const response = await api.post<PaginatedListResponse<Evidence>>(
        `${base}/evidence/search`,
        body,
        { params: { ...params, limit: String(EXPORT_PAGE_SIZE) } },
      );
      rows.push(...(response.data.data ?? []));
      pages = Math.max(response.data.totalPages ?? 1, 1);
      page += 1;
    } while (page <= pages && rows.length <= EXPORT_MAX);
    downloadCsv(buildEvidenceCsv(rows));
    toast.add({
      severity: 'success',
      summary: 'CSV exported',
      detail: `Downloaded ${plural(rows.length, 'evidence item')}.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export failed',
      detail: await getErrorDetail(error, 'Try the export again.'),
      life: 5000,
    });
  } finally {
    exporting.value = false;
  }
}

/** The applied search, for the status trend. */
const trendRequest = computed(() => {
  const { body } = searchRequest(view.value);
  return {
    body,
    name:
      view.value.filter && !isLabelQuery(view.value.filter)
        ? view.value.filter
        : undefined,
  };
});
</script>

<template>
  <ListTemplate title="Evidence" :description="`In scope for ${systemName}.`">
    <template #actions>
      <Button icon="share" @click="share">Share</Button>
      <Button
        icon="download"
        :loading="exporting"
        :disabled-reason="exportDenied"
        @click="beginExport"
        >Export CSV</Button
      >
      <Button
        variant="primary"
        icon="save"
        :to="saveDenied ? undefined : saveLink"
        :disabled-reason="saveDenied"
        >Save as filter</Button
      >
    </template>

    <template v-if="hasScope !== false" #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter evidence"
        search-label="Search evidence"
        search-hint="Search titles (3 characters or more), or labels with key=value and key!=value, grouped with AND, OR and parentheses."
        search-placeholder="e.g. provider=aws AND type!=test"
        :search-error="draftError"
        :chips="chips"
        :summary="summary"
        @search="search"
        @remove="(index) => go(chips[index]!.remove)"
        @clear="clearFilters"
      >
        <SubjectFilterField
          v-model="subject"
          :system-id="systemId"
          @titled="(title) => (subjectName = title)"
        />
        <Disclosure label="Columns">
          <Stack gap="2">
            <Checkbox v-model="showLabels" label="Labels" />
            <Checkbox
              v-if="showLabels"
              v-model="showSystemLabels"
              label="System labels"
              description="Labels starting with _, such as _policy."
            />
          </Stack>
        </Disclosure>
      </FilterBar>
    </template>

    <DataState
      v-if="hasScope === false"
      status="empty"
      subject="evidence"
      empty-title="Define this system's scope"
      empty-body="This system has not declared which evidence belongs to it yet. Add the labels that identify its evidence on the Scope tab."
      icon="evidence"
    >
      <template #empty-actions>
        <Button variant="primary" :to="{ name: 'system:scope' }"
          >Define the scope</Button
        >
      </template>
    </DataState>

    <DataState
      v-else
      :status="status"
      subject="evidence"
      :error-message="errorMessage"
      empty-title="No evidence yet"
      empty-body="Evidence in this system's scope appears here as agents submit it and people upload it."
      icon="evidence"
      :filters="chipLabels"
      @retry="load"
      @clear-filters="clearFilters"
    >
      <DataTable
        v-model:sort="sort"
        :caption="caption"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-status="{ row: r }">
          <StatusBadge
            v-if="r.status === 'satisfied' || r.status === 'not-satisfied'"
            :status="r.status"
          />
          <StatusBadge v-else status="unknown" />
        </template>
        <template #cell-name="{ row: r }">
          <TextLink :to="evidenceLink(r.id)">{{ r.name }}</TextLink>
        </template>
        <template #cell-subjects="{ row: r }">
          <Cluster v-if="r.subjects?.length" gap="1">
            <Tag
              v-for="subject in r.subjects.slice(0, SUBJECT_PREVIEW)"
              :key="subject.subjectUuid"
              :label="subjectTitle(subject)"
            />
            <Text
              v-if="r.subjects.length > SUBJECT_PREVIEW"
              as="span"
              variant="caption"
              >+{{ r.subjects.length - SUBJECT_PREVIEW }} more</Text
            >
          </Cluster>
          <Text v-else as="span" variant="caption">Unattributed</Text>
        </template>
        <template #cell-labels="{ row: r }">
          <Cluster v-if="r.labels.length" gap="1">
            <Tag
              v-for="label in r.labels"
              :key="`${label.name}=${label.value}`"
              :label="`${label.name}=${label.value}`"
            />
          </Cluster>
          <Text v-else as="span" variant="caption">None</Text>
        </template>
        <template #cell-lastSeenAt="{ row: r }">{{
          r.lastSeenAt ? formatLocalDateTime(r.lastSeenAt) : 'Not seen'
        }}</template>
      </DataTable>
    </DataState>

    <template #footer>
      <Pagination
        v-if="status === 'ready' && hasScope"
        :page="view.page"
        :page-count="pageCount"
        :to="pageLink"
        :total-label="showingLabel"
        label="Evidence pages"
      />
      <EvidenceTrends
        v-if="hasScope"
        :endpoint="`${base}/evidence/status-over-time`"
        :request="trendRequest"
      />
    </template>
  </ListTemplate>

  <ConfirmDialog
    v-model:open="confirmExport"
    title="Export evidence?"
    confirm-label="Export CSV"
    tone="primary"
    @confirm="runExport"
    ><Text
      >Export {{ plural(total, 'evidence item') }} from the applied search?
      Large exports can take a while.</Text
    ></ConfirmDialog
  >
</template>
