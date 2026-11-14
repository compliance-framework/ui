<script setup lang="ts">
/**
 * A system's evidence filter suggestions: Generate (scoped, with an estimate of the AI calls) and
 * Suggest filter merges, the latest run's progress, and Pending and History tabs. Pending groups
 * suggestions by the filter they propose, with Edit, Accept and Reject for the group, each
 * control, or a selection. History lists past suggestions with their audit events. The script is
 * the classic page's.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type {
  Catalog,
  Control,
  ImplementedRequirement,
  SystemSecurityPlan,
} from '@/oscal';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import {
  useDashboardSuggestions,
  useSuggestionRunPoller,
} from '@/composables/useDashboardSuggestions';
import { useAiConfigStore } from '@/stores/ai-config';
import type { DataResponse } from '@/stores/types';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import ProgressBar from '@/ds/components/ProgressBar/ProgressBar.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import SuggestionScopeForm from './SuggestionScopeForm.vue';
import SuggestionGroupForm from './SuggestionGroupForm.vue';
import {
  buildControlKey,
  computeGroupEditDiff,
  formatLabelSet,
  runCellFailures,
  type DashboardSuggestion,
  type DashboardSuggestionEvent,
  type EditDashboardSuggestionGroupPayload,
  type GenerateDashboardSuggestionsPayload,
} from '@/views/dashboard/partials/dashboard-suggestions';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const createDenied = computed(() =>
  can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include generating suggestions.",
);
const updateDenied = computed(() =>
  can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include reviewing suggestions.",
);

const route = useRoute();
const router = useRouter();
const toast = useToast();
const sspId = computed(() => String(route.params.sspId));
const aiConfig = useAiConfigStore();
const axios = useAuthenticatedInstance();
// The tab is in the address (?tab=history), like other in-page tabs.
const activeTab = computed(() =>
  route.query.tab === 'history' ? 'history' : 'pending',
);
const tabs = [
  { label: 'Pending', to: { query: {} } },
  { label: 'History', to: { query: { tab: 'history' } } },
];
const showScopeDialog = ref(false);
const showRejectDialog = ref(false);
const showAuditDialog = ref(false);
const rejectReason = ref('');
const rejectIds = ref<string[]>([]);
const selectedSuggestionIds = ref<string[]>([]);
const auditEvents = ref<DashboardSuggestionEvent[]>([]);
const scopeCeilingError = ref('');
const showEditDialog = ref(false);
const editGroup = ref<PendingGroup | null>(null);
const editError = ref('');
const controlTitleById = ref(new Map<string, string>());
const controlCatalogById = ref(new Map<string, string>());
const controlCatalogIdById = ref(new Map<string, string>());
const controlProfileTitlesById = ref(new Map<string, string[]>());

interface SspProfileBinding {
  id?: string;
  uuid?: string;
  title: string;
}

interface ResolvedControlWithCatalog {
  controlId: string;
  title?: string;
  catalogId?: string;
}

interface PendingGroup {
  hash: string;
  labels: string[];
  filterLabelsObject: Record<string, string>;
  evidenceCount: number;
  sampleTitles: string[];
  suggestions: DashboardSuggestion[];
}

const { data: systemSecurityPlan } = useDataApi<SystemSecurityPlan>(
  computed(() => `/api/oscal/system-security-plans/${sspId.value}/full`),
);

const {
  pendingSuggestions,
  historySuggestions,
  labelSets,
  labelKeys,
  pendingSuggestionsLoading,
  historySuggestionsLoading,
  generating,
  generalizing,
  refreshPendingSuggestions,
  refreshHistorySuggestions,
  refreshLabelSets,
  refreshLabelKeys,
  generateSuggestions,
  generalizeSuggestions,
  acceptSuggestions,
  rejectSuggestions,
  editSuggestionGroup,
  editingGroup,
  fetchSuggestionEvents,
} = useDashboardSuggestions(
  sspId,
  computed(
    () =>
      aiConfig.dashboardSuggestionsConfigFetched &&
      aiConfig.dashboardSuggestionsEnabled,
  ),
);

const { run, pollLatest, start } = useSuggestionRunPoller(sspId, async () => {
  await refreshPendingSuggestions();
});

const runStatusLabel = computed(() => {
  if (!run.value) {
    return 'Idle';
  }
  if (run.value.status === 'pending' || run.value.status === 'running') {
    return `${run.value.status} (${run.value.completedCells}/${run.value.plannedCalls})`;
  }
  return run.value.status;
});

const controlOptions = computed(() =>
  (
    systemSecurityPlan.value?.controlImplementation?.implementedRequirements ??
    []
  )
    .map((requirement: ImplementedRequirement) => {
      const controlKey = normalizeControlId(requirement.controlId);
      const title = controlTitleById.value.get(controlKey);
      const catalogTitle = controlCatalogById.value.get(controlKey);
      const catalogId = controlCatalogIdById.value.get(controlKey);
      const profileTitles =
        controlProfileTitlesById.value.get(controlKey) ?? [];
      const titleLabel = title
        ? `${requirement.controlId} - ${title}`
        : requirement.controlId;
      return {
        label: titleLabel,
        // The scope API resolves controls by catalog-qualified key
        // (`<catalogId>:<controlId>`); send that, not the bare control id.
        value: catalogId
          ? buildControlKey(catalogId, requirement.controlId)
          : requirement.controlId,
        controlId: requirement.controlId,
        title,
        catalogTitle,
        profileTitles,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label)),
);

const labelSetByHash = computed(
  () =>
    new Map(
      (labelSets.value ?? []).map((labelSet) => [labelSet.hash, labelSet]),
    ),
);

const pendingGroups = computed(() => {
  const groups = new Map<string, PendingGroup>();

  for (const suggestion of pendingSuggestions.value ?? []) {
    const proposedFilter = suggestion.proposedFilterLabelSet;
    const hasProposedFilter =
      !!proposedFilter && Object.keys(proposedFilter).length > 0;

    // The proposed dashboard is defined by `proposedFilterLabelSet` (a subset of
    // the originating evidence's labels), so group/label/link by that filter.
    // Fall back to the full label set only when no proposed filter is present.
    const key = hasProposedFilter
      ? `filter:${proposedFilterKey(proposedFilter)}`
      : suggestion.labelSetHash;

    let group = groups.get(key);
    if (!group) {
      const matched = labelSetByHash.value.get(suggestion.labelSetHash);
      const evidence = hasProposedFilter
        ? evidenceMatchingFilter(proposedFilter)
        : {
            count: matched?.evidenceCount ?? 0,
            sampleTitles: matched?.sampleTitles ?? [],
          };

      const filterLabelsObject = hasProposedFilter
        ? proposedFilter
        : (matched?.labels ?? suggestion.labelSet ?? suggestion.labels ?? {});

      group = {
        hash: key,
        labels: formatLabelSet(filterLabelsObject),
        filterLabelsObject,
        evidenceCount: evidence.count,
        sampleTitles: evidence.sampleTitles,
        suggestions: [],
      };
      groups.set(key, group);
    }
    group.suggestions.push(suggestion);
  }

  return Array.from(groups.values());
});

// Stable identity for a proposed filter, independent of key insertion order.
function proposedFilterKey(filter: Record<string, string>): string {
  return Object.entries(filter)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

// Evidence matching a proposed filter is every full label set that is a superset
// of the filter, since the dashboard filters on that subset of labels.
function evidenceMatchingFilter(filter: Record<string, string>) {
  const matching = (labelSets.value ?? []).filter((labelSet) =>
    Object.entries(filter).every(
      ([key, value]) => labelSet.labels?.[key] === value,
    ),
  );
  return {
    count: matching.reduce(
      (total, labelSet) => total + (labelSet.evidenceCount ?? 0),
      0,
    ),
    sampleTitles: matching.flatMap((labelSet) => labelSet.sampleTitles ?? []),
  };
}

onMounted(async () => {
  await aiConfig.fetchDashboardSuggestionsConfig();
  if (!aiConfig.dashboardSuggestionsEnabled) {
    return;
  }
  await refreshLabelSets();
  await refreshLabelKeys();
  await refreshHistorySuggestions();
  await pollLatest();
  if (run.value?.status === 'pending' || run.value?.status === 'running') {
    start();
  }
});

watch(
  () => [
    sspId.value,
    aiConfig.dashboardSuggestionsConfigFetched,
    aiConfig.dashboardSuggestionsEnabled,
  ],
  ([, configFetched, enabled]) => {
    if (!configFetched || !enabled) {
      controlTitleById.value = new Map();
      controlCatalogById.value = new Map();
      controlProfileTitlesById.value = new Map();
      return;
    }
    void loadControlMetadata();
  },
  { immediate: true },
);

function groupTitle(suggestion: DashboardSuggestion | undefined) {
  if (!suggestion) {
    return 'Proposed evidence filter';
  }
  return (
    suggestion.proposedFilterName ??
    suggestion.targetFilterName ??
    'Proposed evidence filter'
  );
}

function normalizeControlId(controlId?: string) {
  return (controlId ?? '').toLowerCase();
}

async function loadControlMetadata() {
  controlTitleById.value = new Map();
  controlCatalogById.value = new Map();
  controlCatalogIdById.value = new Map();
  controlProfileTitlesById.value = new Map();

  if (!sspId.value) {
    return;
  }

  try {
    const profilesResponse = await axios.get<DataResponse<SspProfileBinding[]>>(
      `/api/oscal/system-security-plans/${encodeURIComponent(sspId.value)}/profiles`,
    );
    const profileBindings = profilesResponse.data?.data ?? [];
    const resolvedProfileResults = await Promise.allSettled(
      profileBindings
        .map((profileBinding) => ({
          uuid: profileBinding.uuid ?? profileBinding.id,
          title: profileBinding.title,
        }))
        .filter(
          (profileBinding): profileBinding is { uuid: string; title: string } =>
            Boolean(profileBinding.uuid),
        )
        .map(async (profileBinding) => {
          const response = await axios.get<
            DataResponse<ResolvedControlWithCatalog[]>
          >(
            `/api/oscal/profiles/${encodeURIComponent(profileBinding.uuid)}/resolved-with-catalogs`,
          );
          return {
            title: profileBinding.title,
            controls: response.data?.data ?? [],
          };
        }),
    );

    const titles = new Map(controlTitleById.value);
    const controlCatalogIds = new Map<string, string>();
    const profileTitles = new Map<string, Set<string>>();

    for (const result of resolvedProfileResults) {
      if (result.status !== 'fulfilled') {
        continue;
      }

      for (const control of result.value.controls) {
        const controlKey = normalizeControlId(control.controlId);
        if (!controlKey) {
          continue;
        }
        if (control.title && !titles.has(controlKey)) {
          titles.set(controlKey, control.title);
        }
        if (control.catalogId && !controlCatalogIds.has(controlKey)) {
          controlCatalogIds.set(controlKey, control.catalogId);
        }
        const profiles = profileTitles.get(controlKey) ?? new Set();
        profiles.add(result.value.title);
        profileTitles.set(controlKey, profiles);
      }
    }

    const catalogTitles = await loadCatalogControlTitles(
      titles,
      controlCatalogIds,
    );
    controlTitleById.value = titles;
    controlCatalogById.value = catalogTitles;
    controlCatalogIdById.value = controlCatalogIds;
    controlProfileTitlesById.value = new Map(
      Array.from(profileTitles.entries()).map(([controlId, profiles]) => [
        controlId,
        Array.from(profiles).sort((left, right) => left.localeCompare(right)),
      ]),
    );
  } catch {
    const titles = new Map<string, string>();
    const catalogTitles = await loadCatalogControlTitles(titles, new Map());
    controlTitleById.value = titles;
    controlCatalogById.value = catalogTitles;
    controlProfileTitlesById.value = new Map();
  }
}

async function loadCatalogControlTitles(
  titles: Map<string, string>,
  controlCatalogIds: Map<string, string>,
) {
  const catalogTitles = new Map<string, string>();
  const implementedControlIds = new Set(
    systemSecurityPlan.value?.controlImplementation?.implementedRequirements
      ?.map((requirement) => normalizeControlId(requirement.controlId))
      .filter(Boolean) ?? [],
  );
  const missingControlIds = new Set(
    Array.from(implementedControlIds).filter(
      (controlId) => !titles.has(controlId),
    ),
  );

  try {
    const catalogsResponse = await axios.get<DataResponse<Catalog[]>>(
      '/api/oscal/catalogs',
    );
    const catalogs = catalogsResponse.data?.data ?? [];
    const catalogTitleByUuid = new Map(
      catalogs
        .filter((catalog) => catalog.uuid)
        .map((catalog) => [catalog.uuid, catalog.metadata?.title ?? '']),
    );

    for (const [controlId, catalogId] of controlCatalogIds) {
      const catalogTitle = catalogTitleByUuid.get(catalogId);
      if (catalogTitle) {
        catalogTitles.set(controlId, catalogTitle);
      }
    }

    const referencedCatalogIds = new Set(controlCatalogIds.values());
    const catalogIds = catalogs
      .map((catalog) => catalog.uuid)
      .filter(
        (catalogId) =>
          catalogId &&
          missingControlIds.size > 0 &&
          (referencedCatalogIds.size === 0 ||
            referencedCatalogIds.has(catalogId)),
      );

    for (const catalogId of catalogIds) {
      const response = await axios.get<DataResponse<Catalog>>(
        `/api/oscal/catalogs/${encodeURIComponent(catalogId)}/full`,
      );
      collectControlTitles(
        response.data?.data,
        titles,
        catalogTitles,
        missingControlIds,
      );
      if (missingControlIds.size === 0) {
        break;
      }
    }
  } catch {
    return catalogTitles;
  }

  return catalogTitles;
}

function collectControlTitles(
  catalog: Catalog | undefined,
  titles: Map<string, string>,
  catalogTitles: Map<string, string>,
  missingControlIds: Set<string>,
) {
  for (const group of catalog?.groups ?? []) {
    for (const control of group.controls ?? []) {
      collectControlTitle(
        control,
        titles,
        catalogTitles,
        missingControlIds,
        catalog,
      );
    }
  }
  for (const control of catalog?.controls ?? []) {
    collectControlTitle(
      control,
      titles,
      catalogTitles,
      missingControlIds,
      catalog,
    );
  }
}

function collectControlTitle(
  control: Control,
  titles: Map<string, string>,
  catalogTitles: Map<string, string>,
  missingControlIds: Set<string>,
  catalog: Catalog | undefined,
) {
  const controlKey = normalizeControlId(control.id);
  if (controlKey && control.title && !titles.has(controlKey)) {
    titles.set(controlKey, control.title);
    missingControlIds.delete(controlKey);
  }
  if (
    controlKey &&
    catalog?.metadata?.title &&
    !catalogTitles.has(controlKey)
  ) {
    catalogTitles.set(controlKey, catalog.metadata.title);
  }
  for (const childControl of control.controls ?? []) {
    collectControlTitle(
      childControl,
      titles,
      catalogTitles,
      missingControlIds,
      catalog,
    );
  }
}

function groupIds(group: { suggestions: DashboardSuggestion[] }) {
  return group.suggestions.map((suggestion) => suggestion.id);
}

function diffFor(group: PendingGroup) {
  return computeGroupEditDiff(group.suggestions, group.filterLabelsObject);
}

function confidenceLabel(confidence: number | undefined) {
  if (confidence === undefined || confidence === null) {
    return 'Confidence unavailable';
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

async function generate(payload: GenerateDashboardSuggestionsPayload) {
  scopeCeilingError.value = '';
  try {
    const response = await generateSuggestions(payload);
    const generatedRun = response?.data.value?.data;
    if (generatedRun) {
      run.value = generatedRun;
      start();
    }
    showScopeDialog.value = false;
    await refreshPendingSuggestions();
  } catch (error) {
    scopeCeilingError.value = extractErrorMessage(error);
  }
}

async function suggestFilterMerges() {
  try {
    const result = await generalizeSuggestions();
    if (activeTab.value !== 'pending') await router.replace({ query: {} });
    if (!result || result.inserted === 0) {
      toast.add({
        severity: 'info',
        summary: 'No filter merges found',
        detail:
          'No near-duplicate filters differ by a single generalizable label.',
        life: 4000,
      });
      return;
    }
    toast.add({
      severity: 'success',
      summary: `${result.candidates} filter merge${result.candidates === 1 ? '' : 's'} proposed`,
      detail: `${result.inserted} suggestion${result.inserted === 1 ? '' : 's'} added to the pending list.`,
      life: 4000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not suggest filter merges',
      detail: extractErrorMessage(error),
      life: 6000,
    });
  }
}

// Builds the chip label for a generalization group from the number of source
// filters it merges.
function generalizationLabel(group: PendingGroup) {
  const count = group.suggestions[0]?.sourceFilterIds?.length ?? 0;
  return `Merges ${count} filter${count === 1 ? '' : 's'}`;
}

async function acceptOne(id: string) {
  await acceptSuggestions([id]);
  selectedSuggestionIds.value = selectedSuggestionIds.value.filter(
    (selectedId) => selectedId !== id,
  );
}

async function acceptGroup(group: { suggestions: DashboardSuggestion[] }) {
  await acceptSuggestions(groupIds(group));
  selectedSuggestionIds.value = selectedSuggestionIds.value.filter(
    (id) => !groupIds(group).includes(id),
  );
}

async function acceptSelected() {
  const ids = [...selectedSuggestionIds.value];
  await acceptSuggestions(ids);
  selectedSuggestionIds.value = [];
}

function openRejectDialog(ids: string[]) {
  rejectIds.value = [...ids];
  rejectReason.value = '';
  showRejectDialog.value = true;
}

async function rejectPending() {
  const ids = [...rejectIds.value];
  await rejectSuggestions(ids, rejectReason.value || undefined);
  selectedSuggestionIds.value = selectedSuggestionIds.value.filter(
    (id) => !ids.includes(id),
  );
  showRejectDialog.value = false;
}

function resolveControlCatalogId(controlId: string) {
  return controlCatalogIdById.value.get(normalizeControlId(controlId));
}

function openEditDialog(group: PendingGroup) {
  editGroup.value = group;
  editError.value = '';
  showEditDialog.value = true;
}

async function saveGroupEdit(payload: EditDashboardSuggestionGroupPayload) {
  try {
    editError.value = '';
    await editSuggestionGroup(payload);
    selectedSuggestionIds.value = [];
    showEditDialog.value = false;
  } catch (error) {
    // Keep the dialog open and surface the failure inline so the user can retry.
    editError.value = extractErrorMessage(error);
  }
}

async function openAuditDialog(id: string) {
  auditEvents.value = await fetchSuggestionEvents(id);
  showAuditDialog.value = true;
}

function extractErrorMessage(error: unknown) {
  const maybeError = error as {
    response?: { data?: { error?: string; message?: string; data?: unknown } };
    message?: string;
  };
  return (
    maybeError.response?.data?.error ??
    maybeError.response?.data?.message ??
    maybeError.message ??
    'Generation request failed.'
  );
}
</script>

<template>
  <DataState
    v-if="!aiConfig.dashboardSuggestionsConfigFetched"
    status="loading"
    subject="the suggestions configuration"
    skeleton="panel"
  />
  <InlineMessage
    v-else-if="!aiConfig.dashboardSuggestionsEnabled"
    tone="warning"
    title="AI isn't configured"
    ><p>Evidence filter suggestions can't be generated.</p></InlineMessage
  >
  <Stack v-else gap="5">
    <Cluster justify="between" gap="3">
      <Stack gap="2">
        <Text variant="label" as="span">Latest run: {{ runStatusLabel }}</Text>
        <ProgressBar
          v-if="run?.plannedCalls"
          label="Cells generated"
          :value="run.completedCells ?? 0"
          :max="run.plannedCalls"
          :value-text="`${run.completedCells} of ${run.plannedCalls} cells`"
        />
      </Stack>
      <Cluster gap="2">
        <Button
          :loading="generalizing"
          :disabled-reason="createDenied"
          @click="suggestFilterMerges"
          >Suggest filter merges</Button
        >
        <Button
          variant="primary"
          :disabled-reason="createDenied"
          @click="showScopeDialog = true"
          >Generate suggestions</Button
        >
      </Cluster>
    </Cluster>
    <InlineMessage
      v-if="run && (run.status === 'failed' || (run.failedCells ?? 0) > 0)"
      :tone="run.status === 'failed' ? 'error' : 'warning'"
      :title="
        run.status === 'failed'
          ? (run.error ?? 'Suggestion generation failed.')
          : `${run.failedCells} of ${run.plannedCalls} cells failed to generate.`
      "
    >
      <ul v-if="runCellFailures(run).length">
        <li
          v-for="(failure, index) in runCellFailures(run)"
          :key="failure.cellIndex ?? index"
        >
          Cell {{ failure.cellIndex ?? index }}:
          {{ failure.error ?? 'Failed' }}
        </li>
      </ul>
    </InlineMessage>

    <Tabs label="Suggestions" :tabs="tabs">
      <Stack v-if="activeTab === 'pending'" gap="4">
        <Cluster v-if="selectedSuggestionIds.length" gap="2">
          <Text as="span">{{ selectedSuggestionIds.length }} selected</Text>
          <Button :disabled-reason="updateDenied" @click="acceptSelected"
            >Accept selected</Button
          >
          <Button
            :disabled-reason="updateDenied"
            @click="openRejectDialog(selectedSuggestionIds)"
            >Reject selected</Button
          >
        </Cluster>
        <DataState
          :status="
            pendingSuggestionsLoading && !pendingGroups.length
              ? 'loading'
              : pendingGroups.length
                ? 'ready'
                : 'empty'
          "
          subject="the pending suggestions"
          empty-title="No pending suggestions"
          empty-body="Generate suggestions to get evidence filters proposed for this system's controls."
          icon="filter"
          skeleton="panel"
        >
          <Stack gap="4">
            <Panel
              v-for="group in pendingGroups"
              :key="group.hash"
              :title="groupTitle(group.suggestions[0])"
              :level="2"
              :data-testid="`suggestion-group-${group.hash}`"
            >
              <template #actions>
                <Button
                  :disabled-reason="updateDenied"
                  @click="openEditDialog(group)"
                  >Edit</Button
                >
                <Button
                  :disabled-reason="updateDenied"
                  @click="acceptGroup(group)"
                  >Accept group</Button
                >
                <Button
                  :disabled-reason="updateDenied"
                  @click="openRejectDialog(groupIds(group))"
                  >Reject group</Button
                >
              </template>
              <Stack gap="4">
                <Cluster gap="2">
                  <Text v-if="diffFor(group).titleFrom" variant="caption"
                    >Was: {{ diffFor(group).titleFrom }}</Text
                  >
                  <Tag
                    v-if="
                      group.suggestions[0]?.targetFilterId &&
                      !group.suggestions[0]?.isGeneralization
                    "
                    :label="`Extends ${group.suggestions[0].targetFilterName ?? 'an evidence filter'}`"
                  />
                  <Tag
                    v-if="group.suggestions[0]?.isGeneralization"
                    :label="generalizationLabel(group)"
                  />
                  <Tag v-if="diffFor(group).edited" label="Edited" />
                  <TextLink
                    :to="{
                      name: 'evidence:index',
                      query: { filter: group.labels.join(' and ') },
                    }"
                    >{{ group.evidenceCount }} matched evidence</TextLink
                  >
                </Cluster>
                <Cluster gap="1">
                  <Tag
                    v-for="(chip, index) in diffFor(group).labelChips"
                    :key="`${chip.kind}-${chip.text}-${index}`"
                    :label="chip.text"
                    :change="chip.kind === 'unchanged' ? undefined : chip.kind"
                  />
                </Cluster>
                <Text v-if="group.suggestions[0]?.isGeneralization"
                  >{{ group.suggestions[0]?.reasoning }} Accepting moves these
                  controls onto the merged filter and off the source
                  filters.</Text
                >
                <Stack gap="3" as="ul">
                  <li
                    v-for="suggestion in group.suggestions"
                    :key="suggestion.id"
                  >
                    <Stack gap="2">
                      <Cluster justify="between" gap="2">
                        <Checkbox
                          :model-value="
                            selectedSuggestionIds.includes(suggestion.id)
                          "
                          :label="
                            `${suggestion.controlId} ${suggestion.controlTitle ?? ''}`.trim()
                          "
                          :description="
                            [
                              suggestion.addedByUser ? 'Added by you' : '',
                              confidenceLabel(suggestion.confidence),
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          "
                          @update:model-value="
                            (on: boolean) =>
                              (selectedSuggestionIds = on
                                ? [...selectedSuggestionIds, suggestion.id]
                                : selectedSuggestionIds.filter(
                                    (id) => id !== suggestion.id,
                                  ))
                          "
                        />
                        <Cluster gap="2">
                          <Button
                            :disabled-reason="updateDenied"
                            @click="acceptOne(suggestion.id)"
                            >Accept</Button
                          >
                          <Button
                            :disabled-reason="updateDenied"
                            @click="openRejectDialog([suggestion.id])"
                            >Reject</Button
                          >
                        </Cluster>
                      </Cluster>
                      <Disclosure
                        :label="`Reasoning for ${suggestion.controlId}`"
                      >
                        <Text>{{
                          suggestion.reasoning ?? 'No reasoning provided.'
                        }}</Text>
                      </Disclosure>
                    </Stack>
                  </li>
                </Stack>
                <Cluster v-if="diffFor(group).removedControlIds.length" gap="1">
                  <Text as="span" variant="caption">Removed controls:</Text>
                  <Tag
                    v-for="controlId in diffFor(group).removedControlIds"
                    :key="controlId"
                    :label="controlId"
                    change="removed"
                  />
                </Cluster>
              </Stack>
            </Panel>
          </Stack>
        </DataState>
      </Stack>
      <Stack v-else gap="4">
        <DataState
          :status="
            historySuggestionsLoading && !historySuggestions?.length
              ? 'loading'
              : historySuggestions?.length
                ? 'ready'
                : 'empty'
          "
          subject="the suggestion history"
          empty-title="No suggestion history"
          empty-body="Accepted and rejected suggestions appear here."
          icon="filter"
          skeleton="table"
        >
          <Stack gap="2" as="ul">
            <li
              v-for="suggestion in historySuggestions ?? []"
              :key="suggestion.id"
            >
              <Cluster justify="between" gap="2">
                <Stack gap="1">
                  <Text as="span"
                    >{{ suggestion.controlId }}
                    {{ suggestion.controlTitle }}</Text
                  >
                  <Text as="span" variant="caption"
                    >{{ suggestion.status }} ·
                    {{ groupTitle(suggestion) }}</Text
                  >
                </Stack>
                <Button @click="openAuditDialog(suggestion.id)"
                  >Audit events</Button
                >
              </Cluster>
            </li>
          </Stack>
        </DataState>
        <Panel v-if="run" title="Latest run" :level="2">
          <Text
            >{{ run.status }} · {{ run.completedCells }}/{{
              run.plannedCalls
            }}
            completed · {{ run.failedCells }} failed</Text
          >
          <Text variant="caption"
            >Scope: {{ run.scope?.controlKeys?.length ?? 'all' }} controls,
            {{ run.scope?.labelSetHashes?.length ?? 'all' }} label sets</Text
          >
        </Panel>
      </Stack>
    </Tabs>

    <Dialog
      v-model:open="showScopeDialog"
      title="Generate suggestions"
      size="l"
    >
      <SuggestionScopeForm
        v-if="showScopeDialog"
        :ssp-id="sspId"
        :controls="controlOptions"
        :label-keys="labelKeys ?? []"
        :generating="generating"
        :ceiling-error="scopeCeilingError"
        @scope-change="scopeCeilingError = ''"
        @generate="generate"
        @cancel="showScopeDialog = false"
      />
    </Dialog>
    <Dialog
      v-model:open="showEditDialog"
      title="Edit suggestion group"
      size="l"
    >
      <SuggestionGroupForm
        v-if="showEditDialog && editGroup"
        :group="editGroup"
        :control-options="controlOptions"
        :resolve-catalog-id="resolveControlCatalogId"
        :saving="editingGroup"
        :error="editError"
        @save="saveGroupEdit"
        @cancel="showEditDialog = false"
      />
    </Dialog>
    <Dialog v-model:open="showRejectDialog" title="Reject suggestions">
      <form novalidate @submit.prevent="rejectPending">
        <Stack gap="4">
          <FormField label="Reason" hint="Optional">
            <Textarea v-model="rejectReason" :rows="4" />
          </FormField>
          <Cluster justify="end" gap="2">
            <Button @click="showRejectDialog = false">Cancel</Button>
            <Button
              variant="danger"
              type="submit"
              :disabled-reason="updateDenied"
              >Reject</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
    <Dialog v-model:open="showAuditDialog" title="Audit events">
      <Text v-if="!auditEvents.length">No audit events found.</Text>
      <Stack v-else gap="3" as="ol">
        <li
          v-for="event in auditEvents"
          :key="event.id ?? event.uuid ?? `${event.action}-${event.createdAt}`"
        >
          <Text as="span" variant="label">{{ event.action ?? 'event' }}</Text>
          <Text variant="caption"
            >{{ event.actor ?? 'Unknown actor' }} · {{ event.createdAt }}</Text
          >
          <Text v-if="event.reasoning">{{ event.reasoning }}</Text>
          <Text v-if="event.resultingFilterName"
            >Resulting filter: {{ event.resultingFilterName }}</Text
          >
        </li>
      </Stack>
    </Dialog>
  </Stack>
</template>
