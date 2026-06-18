<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <PageHeader>Dashboard suggestions</PageHeader>
      <PageSubHeader>{{ sspTitle }}</PageSubHeader>
    </div>
    <div
      v-if="
        aiConfig.dashboardSuggestionsConfigFetched &&
        aiConfig.dashboardSuggestionsEnabled
      "
      class="flex items-center gap-2"
    >
      <SecondaryButton
        :disabled="generalizing"
        title="Find near-duplicate filters that differ by one label and propose merging them"
        @click="suggestFilterMerges"
      >
        {{ generalizing ? 'Finding merges…' : 'Suggest filter merges' }}
      </SecondaryButton>
      <PrimaryButton @click="showScopeDialog = true">
        Generate suggestions
      </PrimaryButton>
    </div>
  </div>

  <Message
    v-if="
      aiConfig.dashboardSuggestionsConfigFetched &&
      !aiConfig.dashboardSuggestionsEnabled
    "
    severity="warn"
    variant="outlined"
    class="mt-4"
  >
    AI is not configured, so dashboard suggestions cannot be generated.
  </Message>

  <Message
    v-else-if="!aiConfig.dashboardSuggestionsConfigFetched"
    severity="info"
    variant="outlined"
    class="mt-4"
  >
    Loading dashboard suggestions configuration.
  </Message>

  <div v-else-if="aiConfig.dashboardSuggestionsEnabled" class="mt-4 space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <span
        class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
      >
        <i
          v-if="runStatus === 'running' || runStatus === 'pending'"
          class="pi pi-spin pi-spinner"
        />
        {{ runStatusLabel }}
      </span>
      <div v-if="run?.plannedCalls" class="min-w-64">
        <div class="h-2 overflow-hidden rounded bg-zinc-200 dark:bg-slate-700">
          <div
            class="h-full bg-emerald-600"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="mt-1 text-xs text-zinc-500">
          {{ run.completedCells }} / {{ run.plannedCalls }} cells complete
        </p>
      </div>
    </div>

    <Message
      v-if="run && (run.status === 'failed' || (run.failedCells ?? 0) > 0)"
      :severity="run.status === 'failed' ? 'error' : 'warn'"
      variant="outlined"
    >
      <p>
        {{
          run.status === 'failed'
            ? (run.error ?? 'Suggestion generation failed.')
            : `${run.failedCells} of ${run.plannedCalls} cells failed to generate.`
        }}
      </p>
      <ul v-if="runCellFailures(run).length" class="mt-2 list-disc pl-5">
        <li
          v-for="(failure, index) in runCellFailures(run)"
          :key="failure.cellIndex ?? index"
        >
          Cell {{ failure.cellIndex ?? index }}:
          {{ failure.error ?? 'Failed' }}
        </li>
      </ul>
    </Message>

    <div class="flex gap-2 border-b border-zinc-200 dark:border-slate-700">
      <button
        class="px-4 py-2 font-semibold"
        :class="activeTab === 'pending' ? 'border-b-2 border-primary' : ''"
        @click="activeTab = 'pending'"
      >
        Pending
      </button>
      <button
        class="px-4 py-2 font-semibold"
        :class="activeTab === 'history' ? 'border-b-2 border-primary' : ''"
        @click="activeTab = 'history'"
      >
        History
      </button>
    </div>

    <div v-if="activeTab === 'pending'" class="space-y-4">
      <div
        v-if="selectedSuggestionIds.length"
        class="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 p-3 dark:border-slate-700"
      >
        <span class="text-sm text-zinc-600 dark:text-slate-300">
          {{ selectedSuggestionIds.length }} selected
        </span>
        <SecondaryButton @click="acceptSelected"
          >Accept selected</SecondaryButton
        >
        <SecondaryButton @click="openRejectDialog(selectedSuggestionIds)">
          Reject selected
        </SecondaryButton>
      </div>

      <Message
        v-if="!pendingSuggestionsLoading && pendingGroups.length === 0"
        severity="info"
        variant="outlined"
      >
        No pending dashboard suggestions.
      </Message>

      <PageCard
        v-for="group in pendingGroups"
        :key="group.hash"
        :data-testid="`suggestion-group-${group.hash}`"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2
                class="text-lg font-semibold"
                :class="
                  diffFor(group).titleTo
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-zinc-700 dark:text-slate-200'
                "
              >
                {{ groupTitle(group.suggestions[0]) }}
              </h2>
              <span
                v-if="diffFor(group).titleFrom"
                class="text-sm text-blue-700 line-through dark:text-blue-300"
              >
                {{ diffFor(group).titleFrom }}
              </span>
              <Chip
                v-if="
                  group.suggestions[0]?.targetFilterId &&
                  !group.suggestions[0]?.isGeneralization
                "
                :label="`Extends: ${group.suggestions[0].targetFilterName ?? 'dashboard'}`"
              />
              <Chip
                v-if="group.suggestions[0]?.isGeneralization"
                :label="generalizationLabel(group)"
                class="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              />
              <Chip v-if="diffFor(group).edited" label="Edited" />
              <RouterLink
                :to="{
                  name: 'evidence:index',
                  query: { filter: group.labels.join(' and ') },
                }"
                class="text-sm text-zinc-500 hover:underline focus-visible:underline"
                :title="group.sampleTitles.slice(0, 3).join('\n')"
              >
                {{ group.evidenceCount }} matched evidence
              </RouterLink>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span
                v-for="(chip, index) in diffFor(group).labelChips"
                :key="`${chip.kind}-${chip.text}-${index}`"
                class="rounded px-2 py-0.5 text-sm"
                :class="labelChipClass(chip.kind)"
              >
                {{ chip.text }}
              </span>
            </div>
            <p
              v-if="group.suggestions[0]?.isGeneralization"
              class="mt-2 text-sm text-purple-700 dark:text-purple-300"
            >
              {{ group.suggestions[0]?.reasoning }}
              Accepting moves these controls onto the generalized filter and off
              the source filters.
            </p>
          </div>
          <div class="flex gap-2">
            <SecondaryButton @click="openEditDialog(group)">
              Edit
            </SecondaryButton>
            <SecondaryButton @click="acceptGroup(group)">
              Accept group
            </SecondaryButton>
            <SecondaryButton @click="openRejectDialog(groupIds(group))">
              Reject group
            </SecondaryButton>
          </div>
        </div>

        <div class="mt-4 divide-y divide-zinc-200 dark:divide-slate-700">
          <div
            v-for="suggestion in group.suggestions"
            :key="suggestion.id"
            class="py-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <label class="flex min-w-0 items-start gap-3">
                <input
                  v-model="selectedSuggestionIds"
                  type="checkbox"
                  :value="suggestion.id"
                  class="mt-1"
                />
                <span>
                  <span class="font-semibold">
                    {{ suggestion.controlId }}
                  </span>
                  <span>{{ suggestion.controlTitle }}</span>
                  <span
                    v-if="suggestion.addedByUser"
                    class="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Added
                  </span>
                  <span class="ml-2 text-sm text-zinc-500">
                    {{ confidenceLabel(suggestion.confidence) }}
                  </span>
                </span>
              </label>
              <div class="flex gap-2">
                <SecondaryButton @click="toggleReasoning(suggestion.id)">
                  Reasoning
                </SecondaryButton>
                <SecondaryButton @click="acceptOne(suggestion.id)">
                  Accept
                </SecondaryButton>
                <SecondaryButton @click="openRejectDialog([suggestion.id])">
                  Reject
                </SecondaryButton>
              </div>
            </div>
            <div
              v-if="expandedReasoning.has(suggestion.id)"
              class="mt-3 rounded-md bg-zinc-50 p-3 text-sm dark:bg-slate-800"
            >
              <p>
                <span class="font-semibold">Reasoning:</span>
                {{ suggestion.reasoning ?? 'No reasoning provided.' }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="diffFor(group).removedControlIds.length"
          class="mt-3 flex flex-wrap items-center gap-2 text-sm"
        >
          <span class="text-zinc-500">Removed controls:</span>
          <span
            v-for="controlId in diffFor(group).removedControlIds"
            :key="controlId"
            class="rounded bg-red-100 px-2 py-0.5 text-red-800 line-through dark:bg-red-900 dark:text-red-200"
          >
            {{ controlId }}
          </span>
        </div>
      </PageCard>
    </div>

    <div v-else class="space-y-3">
      <Message
        v-if="!historySuggestionsLoading && !historySuggestions?.length"
        severity="info"
        variant="outlined"
      >
        No suggestion history.
      </Message>
      <PageCard
        v-for="suggestion in historySuggestions ?? []"
        :key="suggestion.id"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold">
              {{ suggestion.controlId }} {{ suggestion.controlTitle }}
            </p>
            <p class="text-sm text-zinc-500">
              {{ suggestion.status }} · {{ groupTitle(suggestion) }}
            </p>
          </div>
          <SecondaryButton @click="openAuditDialog(suggestion.id)">
            Audit events
          </SecondaryButton>
        </div>
      </PageCard>

      <PageCard v-if="run">
        <h2 class="text-base font-semibold">Latest run</h2>
        <p class="mt-1 text-sm text-zinc-600 dark:text-slate-300">
          {{ run.status }} · {{ run.completedCells }}/{{
            run.plannedCalls
          }}
          completed · {{ run.failedCells }} failed
        </p>
        <p class="mt-1 text-sm text-zinc-500">
          Scope:
          {{ run.scope?.controlKeys?.length ?? 'all' }} controls,
          {{ run.scope?.labelSetHashes?.length ?? 'all' }} label-sets
        </p>
      </PageCard>
    </div>
  </div>

  <SuggestionScopeDialog
    v-if="aiConfig.dashboardSuggestionsEnabled"
    v-model:visible="showScopeDialog"
    :ssp-id="sspId"
    :controls="controlOptions"
    :label-keys="labelKeys ?? []"
    :generating="generating"
    :ceilingError="scopeCeilingError"
    @scope-change="scopeCeilingError = ''"
    @generate="generate"
  />

  <SuggestionEditDialog
    v-if="aiConfig.dashboardSuggestionsEnabled"
    v-model:visible="showEditDialog"
    :group="editGroup"
    :control-options="controlOptions"
    :resolve-catalog-id="resolveControlCatalogId"
    :saving="editingGroup"
    :error="editError"
    @save="saveGroupEdit"
  />

  <Dialog
    v-if="aiConfig.dashboardSuggestionsEnabled"
    v-model:visible="showRejectDialog"
    modal
    header="Reject suggestions"
    size="sm"
  >
    <label class="inline-block pb-2" for="reject-reason">Reason</label>
    <Textarea
      id="reject-reason"
      v-model="rejectReason"
      rows="4"
      class="w-full"
    />
    <template #footer>
      <SecondaryButton @click="showRejectDialog = false"
        >Cancel</SecondaryButton
      >
      <PrimaryButton @click="rejectPending">Reject</PrimaryButton>
    </template>
  </Dialog>

  <Dialog
    v-if="aiConfig.dashboardSuggestionsEnabled"
    v-model:visible="showAuditDialog"
    modal
    header="Audit events"
    size="md"
  >
    <Message v-if="!auditEvents.length" severity="info" variant="outlined">
      No audit events found.
    </Message>
    <ol v-else class="space-y-3">
      <li
        v-for="event in auditEvents"
        :key="event.id ?? event.uuid ?? `${event.action}-${event.createdAt}`"
        class="rounded-md border border-zinc-200 p-3 dark:border-slate-700"
      >
        <p class="font-semibold">{{ event.action ?? 'event' }}</p>
        <p class="text-sm text-zinc-500">
          {{ event.actor ?? 'Unknown actor' }} · {{ event.createdAt }}
        </p>
        <p v-if="event.reasoning" class="mt-2 text-sm">
          {{ event.reasoning }}
        </p>
        <p v-if="event.resultingFilterName" class="mt-2 text-sm">
          Resulting filter: {{ event.resultingFilterName }}
        </p>
      </li>
    </ol>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PageCard from '@/components/PageCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
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
import Chip from '@/volt/Chip.vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import SuggestionScopeDialog from './partials/SuggestionScopeDialog.vue';
import SuggestionEditDialog from './partials/SuggestionEditDialog.vue';
import {
  buildControlKey,
  computeGroupEditDiff,
  formatLabelSet,
  runCellFailures,
  type DashboardSuggestion,
  type DashboardSuggestionEvent,
  type EditDashboardSuggestionGroupPayload,
  type GenerateDashboardSuggestionsPayload,
  type LabelChipKind,
} from './partials/dashboard-suggestions';

const route = useRoute();
const toast = useToast();
const sspId = computed(() => String(route.params.sspId));
const aiConfig = useAiConfigStore();
const axios = useAuthenticatedInstance();
const activeTab = ref<'pending' | 'history'>('pending');
const showScopeDialog = ref(false);
const showRejectDialog = ref(false);
const showAuditDialog = ref(false);
const rejectReason = ref('');
const rejectIds = ref<string[]>([]);
const selectedSuggestionIds = ref<string[]>([]);
const expandedReasoning = ref(new Set<string>());
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

const { run, progressPercent, pollLatest, start } = useSuggestionRunPoller(
  sspId,
  async () => {
    await refreshPendingSuggestions();
  },
);

const sspTitle = computed(
  () => systemSecurityPlan.value?.metadata?.title ?? 'Selected SSP',
);
const runStatus = computed(() => run.value?.status ?? 'idle');
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
    return 'Proposed dashboard';
  }
  return (
    suggestion.proposedFilterName ??
    suggestion.targetFilterName ??
    'Proposed dashboard'
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

function labelChipClass(kind: LabelChipKind) {
  switch (kind) {
    case 'added':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'removed':
      return 'bg-red-100 text-red-800 line-through dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-slate-700 dark:text-slate-200';
  }
}

function confidenceLabel(confidence: number | undefined) {
  if (confidence === undefined || confidence === null) {
    return 'Confidence unavailable';
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

function toggleReasoning(id: string) {
  const next = new Set(expandedReasoning.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedReasoning.value = next;
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
    activeTab.value = 'pending';
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
