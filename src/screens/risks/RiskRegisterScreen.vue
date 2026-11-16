<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useUserSearch } from '@/composables/workflows';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { Risk, SystemSecurityPlan } from '@/oscal';
import { usePermissionsStore } from '@/stores/permissions';
import type { DataResponse } from '@/stores/types';
import { useSystemStore } from '@/stores/system';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';
import { getRiskIdentifier } from '@/utils/risk-id';
import {
  computeRiskSummary,
  defaultRiskFilters,
  filterRisks,
  getRiskComponentIds,
  getRiskControlIds,
  getRiskEvidenceIds,
  getRiskImpact,
  getRiskLikelihood,
  getRiskOwnerDisplay,
  getRiskReviewDeadline,
  sortRisks,
  type RiskFilters,
} from '@/utils/risk-register';
import {
  looksLikeUuid,
  riskOwnerRefs,
  riskStatusLabel,
} from '@/utils/risk-workflow';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery, type QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import MetricTile from '@/ds/components/MetricTile/MetricTile.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import RiskFormDialog from './RiskFormDialog.vue';
import {
  LEVEL_OPTIONS,
  SORT_OPTIONS,
  readRegisterView,
  registerQuery,
  riskBadge,
  riskDetailLink,
  risksTabs,
  type RegisterView,
} from './risks';

/**
 * This System > Risks, Register tab: every risk in the system with the classic register's
 * filters (search, status, likelihood, impact, owner, review deadline, control, evidence) and
 * sort, all in the URL, so the dashboard and other pages can link to a narrowed register.
 * Create, edit and delete happen here; each risk opens on its detail page.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();
const systemStore = useSystemStore();
const { loadUsersByIds, getCachedUser } = useUserSearch();

/** Under /systems/:systemId the register is one system's; at /admin/risks it spans them all. */
const systemId = route.params.systemId ? String(route.params.systemId) : '';
const global = !systemId;
const systemName = computed(
  () => systemStore.system.securityPlan?.metadata.title ?? 'this system',
);
/** Global risks carry their system as `ssp-id`. */
function riskSystem(risk: Risk): string {
  return systemId || String((risk as { sspId?: string }).sspId ?? '');
}
const riskPath = (risk: Risk) =>
  `/api/oscal/system-security-plans/${riskSystem(risk)}/risks/${getRiskIdentifier(risk)}`;

// Systems, for the global register's System column, filter and New risk.
const plans = global
  ? useApiQuery<SystemSecurityPlan[]>('/api/oscal/system-security-plans')
  : undefined;
const systemOptions = computed(() =>
  (plans?.data.value ?? [])
    .map((plan) => ({ value: plan.uuid, label: plan.metadata.title }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
const systemTitle = (id: string) =>
  systemOptions.value.find((o) => o.value === id)?.label ?? 'Unknown system';
const systemFilter = computed(() =>
  global ? String(route.query.system ?? '') : '',
);
function setSystem(system: string): void {
  void router.push({ query: { ...route.query, system: system || undefined } });
}
const view = computed(() => readRegisterView(route.query));

function withView(next: RegisterView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of [...Object.keys(defaultRiskFilters), 'sort', 'dir'])
    delete query[key];
  return { ...query, ...registerQuery(next) };
}
function go(
  filters: Partial<RiskFilters>,
  extra: Partial<Omit<RegisterView, 'filters'>> = {},
) {
  // A filter change from here replaces the dashboard's hidden drill-down filters.
  const reset = {
    statusCategory: 'all',
    riskId: '',
    createdFrom: '',
    createdTo: '',
  };
  void router.push({
    query: withView({
      ...view.value,
      ...extra,
      filters: { ...view.value.filters, ...reset, ...filters },
    }),
  });
}

// Data ----------------------------------------------------------------------------------------

const status = ref<QueryStatus>('loading');
const risks = ref<Risk[]>([]);

async function load(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Risk[]>>(
      global
        ? '/api/risks'
        : `/api/oscal/system-security-plans/${systemId}/risks`,
    );
    risks.value = response.data.data ?? [];
    status.value = 'ready';
    const owners = [...new Set(risks.value.flatMap(riskOwnerRefs))];
    if (owners.length) void loadUsersByIds(owners);
  } catch (error) {
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}
void load();

function ownerName(risk: Risk): string {
  for (const ref of riskOwnerRefs(risk)) {
    const user = getCachedUser(ref);
    if (user?.displayName || user?.email || user?.id)
      return user.displayName || user.email || user.id;
  }
  const fallback = getRiskOwnerDisplay(risk);
  return fallback && !looksLikeUuid(fallback) ? fallback : 'Unassigned';
}

// Summary -------------------------------------------------------------------------------------

const summary = computed(() => computeRiskSummary(risks.value));
const reset: RiskFilters = { ...defaultRiskFilters };
const tiles = computed(() => [
  {
    key: 'active',
    label: 'Active risks',
    value: String(summary.value.total),
    to: { query: withView({ ...view.value, filters: { ...reset } }) },
  },
  {
    key: 'open',
    label: 'Open',
    value: String(summary.value.open),
    to: {
      query: withView({ ...view.value, filters: { ...reset, status: 'open' } }),
    },
  },
  {
    key: 'accepted',
    label: 'Accepted',
    value: String(summary.value.accepted),
    to: {
      query: withView({
        ...view.value,
        filters: { ...reset, status: 'risk-accepted' },
      }),
    },
  },
  {
    key: 'overdue',
    label: 'Overdue reviews',
    value: String(summary.value.overdueReviews),
    to: {
      query: withView({
        ...view.value,
        filters: { ...reset, review: 'overdue' },
      }),
    },
  },
]);

// Filters -------------------------------------------------------------------------------------

const draft = ref(view.value.filters.search);
watch(
  () => view.value.filters.search,
  (q) => (draft.value = q),
);
const statusOptions = [
  { value: 'not-closed', label: 'Not closed' },
  { value: 'all', label: 'Any status' },
  ...[
    'open',
    'investigating',
    'mitigating-planned',
    'mitigating-implemented',
    'risk-accepted',
    'remediated',
    'closed',
  ].map((value) => ({ value, label: riskStatusLabel(value) })),
];
const levelOptions = [{ value: 'all', label: 'Any' }, ...LEVEL_OPTIONS];
const reviewOptions = [
  { value: 'all', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
];

const chips = computed(() => {
  const f = view.value.filters;
  const label = (options: { value: string; label: string }[], value: string) =>
    options.find((o) => o.value === value)?.label ?? value;
  const list: { label: string; remove: Partial<RiskFilters> }[] = [];
  if (f.search)
    list.push({ label: `Search: ${f.search}`, remove: { search: '' } });
  if (f.status !== defaultRiskFilters.status)
    list.push({
      label: `Status: ${label(statusOptions, f.status)}`,
      remove: { status: defaultRiskFilters.status },
    });
  if (f.likelihood !== 'all')
    list.push({
      label: `Likelihood: ${label(LEVEL_OPTIONS, f.likelihood)}`,
      remove: { likelihood: 'all' },
    });
  if (f.impact !== 'all')
    list.push({
      label: `Impact: ${label(LEVEL_OPTIONS, f.impact)}`,
      remove: { impact: 'all' },
    });
  if (f.owner) list.push({ label: `Owner: ${f.owner}`, remove: { owner: '' } });
  if (f.review !== 'all')
    list.push({
      label: `Review: ${label(reviewOptions, f.review)}`,
      remove: { review: 'all' },
    });
  if (f.controlId)
    list.push({ label: `Control: ${f.controlId}`, remove: { controlId: '' } });
  if (f.evidenceId)
    list.push({
      label: `Evidence: ${f.evidenceId}`,
      remove: { evidenceId: '' },
    });
  if (f.statusCategory !== 'all')
    list.push({
      label: `Group: ${f.statusCategory}`,
      remove: { statusCategory: 'all' },
    });
  if (f.riskId) list.push({ label: 'One risk', remove: { riskId: '' } });
  return list;
});
const allChips = computed(() => [
  ...(systemFilter.value
    ? [
        {
          label: `System: ${systemTitle(systemFilter.value)}`,
          clear: () => setSystem(''),
        },
      ]
    : []),
  ...chips.value.map((chip) => ({
    label: chip.label,
    clear: () => go(chip.remove),
  })),
]);
const clearAll = () =>
  void router.push({
    query: {
      ...withView({ ...view.value, filters: { ...defaultRiskFilters } }),
      system: undefined,
    },
  });

// Free-text filters apply on Enter or when the field loses focus, so typing doesn't push history.
const ownerDraft = ref(view.value.filters.owner);
const controlDraft = ref(view.value.filters.controlId);
const evidenceDraft = ref(view.value.filters.evidenceId);
watch(
  () => view.value.filters,
  (f) => {
    ownerDraft.value = f.owner;
    controlDraft.value = f.controlId;
    evidenceDraft.value = f.evidenceId;
  },
);

// Results -------------------------------------------------------------------------------------

const rows = computed(() =>
  sortRisks(
    filterRisks(risks.value, view.value.filters).filter(
      (risk) => !systemFilter.value || riskSystem(risk) === systemFilter.value,
    ),
    view.value.sort,
    view.value.dir,
  ).map((risk) => {
    const deadline = getRiskReviewDeadline(risk);
    const overdue = Boolean(deadline) && Date.parse(deadline!) < Date.now();
    return {
      id: getRiskIdentifier(risk),
      risk,
      system: global ? systemTitle(riskSystem(risk)) : '',
      status: riskBadge(risk.status),
      likelihood: getRiskLikelihood(risk),
      impact: getRiskImpact(risk),
      owner: ownerName(risk),
      review: deadline ? formatDate(deadline) : 'Not set',
      overdue,
      links: [
        risk.threatIds?.length ? plural(risk.threatIds.length, 'threat') : '',
        getRiskEvidenceIds(risk).length
          ? plural(getRiskEvidenceIds(risk).length, 'evidence item')
          : '',
        getRiskControlIds(risk).length
          ? plural(getRiskControlIds(risk).length, 'control')
          : '',
        getRiskComponentIds(risk).length
          ? plural(getRiskComponentIds(risk).length, 'component')
          : '',
      ].filter(Boolean),
    };
  }),
);
const listStatus = computed<QueryStatus>(() =>
  status.value === 'ready'
    ? rows.value.length
      ? 'ready'
      : 'empty'
    : status.value,
);

// Create, edit, delete ------------------------------------------------------------------------

const can = (action: string) => permissions.can(RESOURCES.RISK, action);
const createDenied = computed(() =>
  can(ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating risks.",
);
const formOpen = ref(false);
const editing = ref<Risk>();
function openCreate(): void {
  editing.value = undefined;
  formOpen.value = true;
}
function saved(): void {
  void load();
}

const toDelete = ref<Risk>();
const confirmDelete = computed({
  get: () => Boolean(toDelete.value),
  set: (open: boolean) => {
    if (!open) toDelete.value = undefined;
  },
});
async function remove(): Promise<void> {
  const risk = toDelete.value;
  toDelete.value = undefined;
  if (!risk) return;
  try {
    await api.delete(riskPath(risk));
    risks.value = risks.value.filter((r) => r !== risk);
    toast.add({
      severity: 'success',
      summary: 'Risk deleted',
      detail: risk.title,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The risk wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function rowActions(risk: Risk): MenuEntry[] {
  const id = getRiskIdentifier(risk);
  return [
    ...(id
      ? [
          {
            label: 'Open',
            icon: 'next' as const,
            to: riskDetailLink(id, !global),
          },
        ]
      : []),
    {
      label: 'Edit',
      icon: 'edit',
      disabledReason: can(ACTIONS.UPDATE)
        ? undefined
        : "Your access doesn't include editing risks.",
      onSelect: () => {
        editing.value = risk;
        formOpen.value = true;
      },
    },
    {
      label: 'Delete',
      icon: 'delete',
      tone: 'danger',
      disabledReason: !id
        ? 'This risk has no identifier.'
        : can(ACTIONS.DELETE)
          ? undefined
          : "Your access doesn't include deleting risks.",
      onSelect: () => (toDelete.value = risk),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="Risks"
    :description="
      global ? 'Risks across every system.' : `Risk register for ${systemName}.`
    "
    :tabs="global ? undefined : risksTabs(systemId)"
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="openCreate"
        >New risk</Button
      >
    </template>

    <template #filters>
      <Stack gap="4">
        <Grid min="sm" gap="3">
          <MetricTile
            v-for="tile in tiles"
            :key="tile.key"
            :label="tile.label"
            :value="tile.value"
            :to="tile.to"
          />
        </Grid>
        <FilterBar
          v-model:query="draft"
          label="Filter risks"
          search-label="Search risks"
          search-placeholder="Title, status or owner"
          :chips="allChips"
          :summary="
            allChips.length && status === 'ready'
              ? `${plural(rows.length, 'risk')} match.`
              : ''
          "
          @search="go({ search: draft.trim() })"
          @remove="(index) => allChips[index]!.clear()"
          @clear="clearAll"
        >
          <FormField v-if="global" label="System">
            <Select
              :model-value="systemFilter"
              :options="[{ value: '', label: 'Any system' }, ...systemOptions]"
              @update:model-value="setSystem"
            />
          </FormField>
          <FormField label="Status">
            <Select
              :model-value="view.filters.status"
              :options="statusOptions"
              @update:model-value="(value) => go({ status: value })"
            />
          </FormField>
          <FormField label="Sort by">
            <Select
              :model-value="view.sort"
              :options="SORT_OPTIONS"
              @update:model-value="
                (value) => go({}, { sort: value as RegisterView['sort'] })
              "
            />
          </FormField>
          <Disclosure label="More filters">
            <Grid min="sm" gap="3">
              <FormField label="Likelihood">
                <Select
                  :model-value="view.filters.likelihood"
                  :options="levelOptions"
                  @update:model-value="(value) => go({ likelihood: value })"
                />
              </FormField>
              <FormField label="Impact">
                <Select
                  :model-value="view.filters.impact"
                  :options="levelOptions"
                  @update:model-value="(value) => go({ impact: value })"
                />
              </FormField>
              <FormField label="Review deadline">
                <Select
                  :model-value="view.filters.review"
                  :options="reviewOptions"
                  @update:model-value="
                    (value) => go({ review: value as RiskFilters['review'] })
                  "
                />
              </FormField>
              <FormField label="Order">
                <Select
                  :model-value="view.dir"
                  :options="[
                    { value: 'desc', label: 'Newest or highest first' },
                    { value: 'asc', label: 'Oldest or lowest first' },
                  ]"
                  @update:model-value="
                    (value) => go({}, { dir: value as RegisterView['dir'] })
                  "
                />
              </FormField>
              <FormField label="Owner" hint="Name, email or ID; press Enter.">
                <TextInput
                  v-model="ownerDraft"
                  @keydown.enter.prevent="go({ owner: ownerDraft.trim() })"
                  @blur="
                    ownerDraft.trim() !== view.filters.owner &&
                    go({ owner: ownerDraft.trim() })
                  "
                />
              </FormField>
              <FormField label="Control" hint="Control ID; press Enter.">
                <TextInput
                  v-model="controlDraft"
                  @keydown.enter.prevent="
                    go({ controlId: controlDraft.trim() })
                  "
                  @blur="
                    controlDraft.trim() !== view.filters.controlId &&
                    go({ controlId: controlDraft.trim() })
                  "
                />
              </FormField>
              <FormField label="Evidence" hint="Evidence ID; press Enter.">
                <TextInput
                  v-model="evidenceDraft"
                  @keydown.enter.prevent="
                    go({ evidenceId: evidenceDraft.trim() })
                  "
                  @blur="
                    evidenceDraft.trim() !== view.filters.evidenceId &&
                    go({ evidenceId: evidenceDraft.trim() })
                  "
                />
              </FormField>
            </Grid>
          </Disclosure>
        </FilterBar>
      </Stack>
    </template>

    <DataState
      :status="listStatus"
      subject="risks"
      empty-title="No risks yet"
      empty-body="A risk records something that could stop a control working, with how likely it is, how much it would matter, and what is being done about it."
      icon="risks"
      :filters="allChips.map((c) => c.label)"
      @retry="load"
      @clear-filters="clearAll"
    >
      <template #empty-actions>
        <Button
          variant="primary"
          icon="add"
          :disabled-reason="createDenied"
          @click="openCreate"
          >New risk</Button
        >
      </template>
      <DataTable
        :caption="global ? 'Risks in every system' : 'Risks in this system'"
        caption-hidden
        :columns="[
          { key: 'title', label: 'Risk', minWidth: 'md' },
          ...(global ? [{ key: 'system', label: 'System' }] : []),
          { key: 'status', label: 'Status', nowrap: true },
          { key: 'likelihood', label: 'Likelihood', nowrap: true },
          { key: 'impact', label: 'Impact', nowrap: true },
          { key: 'owner', label: 'Owner' },
          { key: 'review', label: 'Review by', nowrap: true },
        ]"
        :rows="rows"
        :row-key="(r) => r.id || r.risk.title || ''"
      >
        <template #cell-title="{ row: r }">
          <Stack gap="1">
            <TextLink v-if="r.id" :to="riskDetailLink(r.id, !global)">{{
              r.risk.title || 'Untitled risk'
            }}</TextLink>
            <Text v-else as="span">{{ r.risk.title || 'Untitled risk' }}</Text>
            <Text v-if="r.risk.description" as="span" variant="caption">{{
              r.risk.description
            }}</Text>
            <Cluster v-if="r.links.length" gap="1">
              <Tag v-for="item in r.links" :key="item" :label="item" />
            </Cluster>
          </Stack>
        </template>
        <template #cell-status="{ row: r }">
          <StatusBadge v-if="r.status" :status="r.status" />
          <template v-else>{{ riskStatusLabel(r.risk.status) }}</template>
        </template>
        <template #cell-likelihood="{ row: r }">
          <StatusBadge
            v-if="riskBadge(r.likelihood)"
            :status="riskBadge(r.likelihood)!"
          />
          <template v-else>{{ r.likelihood || 'Not rated' }}</template>
        </template>
        <template #cell-impact="{ row: r }">
          <StatusBadge
            v-if="riskBadge(r.impact)"
            :status="riskBadge(r.impact)!"
          />
          <template v-else>{{ r.impact || 'Not rated' }}</template>
        </template>
        <template #cell-review="{ row: r }">
          <Stack gap="1">
            {{ r.review }}
            <Tag v-if="r.overdue" label="Overdue" />
          </Stack>
        </template>
        <template #actions="{ row: r }">
          <Menu
            :label="`Actions for ${r.risk.title || 'risk'}`"
            :items="rowActions(r.risk)"
          />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <RiskFormDialog
    v-model:open="formOpen"
    :system-id="editing ? riskSystem(editing) : systemId || undefined"
    :systems="global ? systemOptions : undefined"
    :risk="editing"
    @saved="saved"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${toDelete?.title || 'this risk'}?`"
    confirm-label="Delete risk"
    @confirm="remove"
    ><Text
      >The risk is removed from the register for good. It can't be undone.</Text
    ></ConfirmDialog
  >
</template>
