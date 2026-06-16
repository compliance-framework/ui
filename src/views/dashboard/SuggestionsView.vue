<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <PageHeader>Dashboard suggestions</PageHeader>
      <PageSubHeader>{{ sspTitle }}</PageSubHeader>
    </div>
    <PrimaryButton
      v-if="
        aiConfig.dashboardSuggestionsConfigFetched &&
        aiConfig.dashboardSuggestionsEnabled
      "
      @click="showScopeDialog = true"
    >
      Generate suggestions
    </PrimaryButton>
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
      v-if="run?.status === 'failed'"
      severity="error"
      variant="outlined"
    >
      <p>{{ run.error ?? 'Suggestion generation failed.' }}</p>
      <ul v-if="run.failures?.length" class="mt-2 list-disc pl-5">
        <li v-for="failure in run.failures" :key="failureKey(failure)">
          {{ failure.controlKey ?? 'Unknown control' }} /
          {{ failure.labelSetHash ?? 'Unknown label set' }}:
          {{ failure.message ?? 'Failed' }}
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
                class="text-lg font-semibold text-zinc-700 dark:text-slate-200"
              >
                {{ groupTitle(group.suggestions[0]) }}
              </h2>
              <Chip
                v-if="group.suggestions[0]?.action === 'extend'"
                :label="`Extends: ${group.suggestions[0].targetFilterName ?? 'dashboard'}`"
              />
              <span class="text-sm text-zinc-500">
                {{ group.evidenceCount }} matched evidence
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <Chip v-for="label in group.labels" :key="label" :label="label" />
            </div>
          </div>
          <div class="flex gap-2">
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
                <span class="font-semibold">Control fit:</span>
                {{
                  suggestion.controlFitReasoning ??
                  suggestion.reasoning ??
                  'No control-fit reasoning provided.'
                }}
              </p>
              <p class="mt-2">
                <span class="font-semibold">System relevance:</span>
                {{
                  suggestion.systemRelevanceReasoning ??
                  suggestion.reasoning ??
                  'No system-relevance reasoning provided.'
                }}
              </p>
            </div>
          </div>
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
    :controls="controlOptions"
    :labelSets="labelSets ?? []"
    :generating="generating"
    :ceilingError="scopeCeilingError"
    @scope-change="scopeCeilingError = ''"
    @generate="generate"
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
import { useRoute } from 'vue-router';
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
import {
  formatLabelSet,
  type DashboardSuggestion,
  type DashboardSuggestionEvent,
  type GenerateDashboardSuggestionsPayload,
  type SuggestionRunFailure,
} from './partials/dashboard-suggestions';

const route = useRoute();
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
const controlTitleById = ref(new Map<string, string>());
const controlProfileTitlesById = ref(new Map<string, string[]>());

interface SspProfileBinding {
  id?: string;
  uuid?: string;
  title: string;
}

interface ResolvedControlWithCatalog {
  controlId: string;
  title?: string;
}

const { data: systemSecurityPlan } = useDataApi<SystemSecurityPlan>(
  computed(() => `/api/oscal/system-security-plans/${sspId.value}/full`),
);

const {
  pendingSuggestions,
  historySuggestions,
  labelSets,
  pendingSuggestionsLoading,
  historySuggestionsLoading,
  generating,
  refreshPendingSuggestions,
  refreshHistorySuggestions,
  refreshLabelSets,
  generateSuggestions,
  acceptSuggestions,
  rejectSuggestions,
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
      const title = controlTitleById.value.get(requirement.controlId);
      const profileTitles =
        controlProfileTitlesById.value.get(requirement.controlId) ?? [];
      const titleLabel = title
        ? `${requirement.controlId} - ${title}`
        : requirement.controlId;
      const profileLabel = profileTitles.length
        ? ` (${profileTitles.join(', ')})`
        : '';
      return {
        label: `${titleLabel}${profileLabel}`,
        value: requirement.controlId,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label)),
);

const pendingGroups = computed(() => {
  const groups = new Map<
    string,
    {
      hash: string;
      labels: string[];
      evidenceCount: number;
      suggestions: DashboardSuggestion[];
    }
  >();

  for (const suggestion of pendingSuggestions.value ?? []) {
    const group = groups.get(suggestion.labelSetHash) ?? {
      hash: suggestion.labelSetHash,
      labels: formatLabelSet(suggestion.labels ?? {}),
      evidenceCount: suggestion.evidenceCount ?? 0,
      suggestions: [],
    };
    group.evidenceCount = Math.max(
      group.evidenceCount,
      suggestion.evidenceCount ?? 0,
    );
    group.suggestions.push(suggestion);
    groups.set(suggestion.labelSetHash, group);
  }

  return Array.from(groups.values());
});

onMounted(async () => {
  await aiConfig.fetchDashboardSuggestionsConfig();
  if (!aiConfig.dashboardSuggestionsEnabled) {
    return;
  }
  await refreshLabelSets();
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

async function loadControlMetadata() {
  controlTitleById.value = new Map();
  controlProfileTitlesById.value = new Map();

  if (!sspId.value) {
    return;
  }

  controlTitleById.value = await loadCatalogControlTitles();

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
    const profileTitles = new Map<string, Set<string>>();

    for (const result of resolvedProfileResults) {
      if (result.status !== 'fulfilled') {
        continue;
      }

      for (const control of result.value.controls) {
        if (!control.controlId) {
          continue;
        }
        if (control.title && !titles.has(control.controlId)) {
          titles.set(control.controlId, control.title);
        }
        const profiles = profileTitles.get(control.controlId) ?? new Set();
        profiles.add(result.value.title);
        profileTitles.set(control.controlId, profiles);
      }
    }

    controlTitleById.value = titles;
    controlProfileTitlesById.value = new Map(
      Array.from(profileTitles.entries()).map(([controlId, profiles]) => [
        controlId,
        Array.from(profiles).sort((left, right) => left.localeCompare(right)),
      ]),
    );
  } catch {
    controlProfileTitlesById.value = new Map();
  }
}

async function loadCatalogControlTitles() {
  const titles = new Map<string, string>();

  try {
    const catalogsResponse = await axios.get<DataResponse<Catalog[]>>(
      '/api/oscal/catalogs',
    );
    const catalogIds = (catalogsResponse.data?.data ?? [])
      .map((catalog) => catalog.uuid)
      .filter(Boolean);
    const catalogResults = await Promise.allSettled(
      catalogIds.map((catalogId) =>
        axios.get<DataResponse<Catalog>>(
          `/api/oscal/catalogs/${encodeURIComponent(catalogId)}/full`,
        ),
      ),
    );

    for (const result of catalogResults) {
      if (result.status !== 'fulfilled') {
        continue;
      }
      collectControlTitles(result.value.data?.data, titles);
    }
  } catch {
    return titles;
  }

  return titles;
}

function collectControlTitles(
  catalog: Catalog | undefined,
  titles: Map<string, string>,
) {
  for (const group of catalog?.groups ?? []) {
    for (const control of group.controls ?? []) {
      collectControlTitle(control, titles);
    }
  }
  for (const control of catalog?.controls ?? []) {
    collectControlTitle(control, titles);
  }
}

function collectControlTitle(control: Control, titles: Map<string, string>) {
  if (control.id && control.title && !titles.has(control.id)) {
    titles.set(control.id, control.title);
  }
  for (const childControl of control.controls ?? []) {
    collectControlTitle(childControl, titles);
  }
}

function groupIds(group: { suggestions: DashboardSuggestion[] }) {
  return group.suggestions.map((suggestion) => suggestion.id);
}

function confidenceLabel(confidence: number | undefined) {
  if (confidence === undefined || confidence === null) {
    return 'Confidence unavailable';
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

function failureKey(failure: SuggestionRunFailure) {
  return `${failure.controlKey ?? 'control'}-${failure.labelSetHash ?? 'label'}-${failure.message ?? 'failed'}`;
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
