<template>
  <div class="p-6 space-y-6">
    <PageHeader>{{ pageTitle }}</PageHeader>

    <Message v-if="contextMissing" severity="error" variant="outlined">
      <h4 class="font-bold">{{ missingContextTitle }}</h4>
      <p class="text-sm">{{ missingContextDetail }}</p>
    </Message>

    <div v-else class="space-y-6">
      <div v-if="loading" class="text-sm text-gray-600 dark:text-slate-400">
        Loading risk details...
      </div>

      <Message v-else-if="loadError" severity="error" variant="outlined">
        <h4 class="font-bold">Error loading risk</h4>
        <p class="text-sm">{{ loadError }}</p>
      </Message>

      <Message v-else-if="notFound" severity="warn" variant="outlined">
        <h4 class="font-bold">Risk not found</h4>
        <p class="text-sm">The requested risk could not be located.</p>
      </Message>

      <div v-else-if="risk" class="space-y-6">
        <div
          class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6 space-y-4"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">
              {{ risk.title || 'Untitled Risk' }}
            </h2>
            <div class="text-sm text-gray-700 dark:text-slate-300">
              {{ risk.description || 'No description provided.' }}
            </div>
            <div
              v-if="risk.statement"
              class="text-sm text-gray-600 dark:text-slate-300"
            >
              <span class="font-semibold">Statement:</span>
              <span class="ml-1">{{ risk.statement }}</span>
            </div>
          </div>

          <div
            class="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-300"
          >
            <div>
              <span class="font-semibold">Status:</span>
              <span class="ml-1 capitalize">{{ risk.status }}</span>
            </div>
            <div>
              <span class="font-semibold">Review Deadline:</span>
              <span class="ml-1">{{ formatDate(risk.deadline) }}</span>
            </div>
            <div>
              <span class="font-semibold">Threat IDs:</span>
              <span class="ml-1">
                <template v-if="risk.threatIds?.length">
                  {{
                    risk.threatIds
                      .map((item) =>
                        typeof item === 'string' ? item : item.id,
                      )
                      .filter(Boolean)
                      .join(', ')
                  }}
                </template>
                <template v-else>None</template>
              </span>
            </div>
          </div>
        </div>

        <div
          class="border-b border-ccf-300 dark:border-slate-700 flex flex-wrap gap-2 pb-2"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3 py-1 rounded-md text-sm"
            :class="
              tab.id === activeTab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <div>
          <div v-if="activeTab === 'overview'" class="space-y-4">
            <div
              v-if="risk.remarks"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Remarks
              </h3>
              <p class="text-sm text-gray-700 dark:text-slate-300 mt-2">
                {{ risk.remarks }}
              </p>
            </div>

            <div
              v-if="risk.relatedObservations?.length"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Related Observations
              </h3>
              <ul
                class="list-disc list-inside text-sm text-gray-700 dark:text-slate-300 mt-2"
              >
                <li
                  v-for="obs in risk.relatedObservations"
                  :key="obs.observationUuid"
                >
                  {{ obs.observationUuid }}
                </li>
              </ul>
            </div>
          </div>

          <div v-else-if="activeTab === 'evidence'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Evidence
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('evidence')"
              >
                Add Evidence
              </button>
            </div>

            <div
              v-if="!evidenceAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No evidence linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="item in evidenceAssociations"
                :key="item.id"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      {{ item.description || 'No description.' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-slate-500">
                      {{ formatDate(item.start) }}
                      <template v-if="item.end">
                        → {{ formatDate(item.end) }}
                      </template>
                    </p>
                  </div>
                  <div class="flex gap-2 self-start">
                    <RouterLinkButton
                      v-if="item.evidenceId || item.id"
                      variant="text"
                      :to="{
                        name: 'evidence:view',
                        params: { id: item.evidenceId || item.id },
                      }"
                    >
                      Open
                    </RouterLinkButton>
                    <button
                      class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                      :disabled="saving"
                      @click="
                        unlinkAssociation('evidence', item.id, item.title)
                      "
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'controls'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Controls
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('controls')"
              >
                Add Control
              </button>
            </div>

            <div
              v-if="!controlAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No controls linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="item in controlAssociations"
                :key="item.id"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.controlId || item.id }} - {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      Catalog: {{ item.catalogName || 'N/A' }}
                    </p>
                    <p
                      v-if="item.description"
                      class="text-sm text-gray-600 dark:text-slate-400"
                    >
                      {{ item.description }}
                    </p>
                  </div>
                  <div class="flex gap-2 self-start">
                    <RouterLinkButton variant="text" :to="controlRoute(item)">
                      Open
                    </RouterLinkButton>
                    <button
                      class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                      :disabled="saving"
                      @click="
                        unlinkAssociation('controls', item.id, item.title)
                      "
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'components'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Components
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('components')"
              >
                Add Component
              </button>
            </div>

            <div
              v-if="!componentAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No components linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="item in componentAssociations"
                :key="item.id"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      Type: {{ item.type || 'N/A' }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      {{ item.description || 'No description.' }}
                    </p>
                  </div>
                  <div class="flex gap-2 self-start">
                    <RouterLinkButton variant="text" :to="componentRoute(item)">
                      Open
                    </RouterLinkButton>
                    <button
                      class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                      :disabled="saving"
                      @click="
                        unlinkAssociation('components', item.id, item.title)
                      "
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'history-events'" class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
              History &amp; Events
            </h3>

            <div
              v-if="loadingEvents"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              Loading risk events...
            </div>

            <div
              v-else-if="!riskEvents.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No events have been recorded for this risk.
            </div>

            <ol
              v-else
              class="relative border-s border-ccf-300 dark:border-slate-700 ps-5 space-y-6"
            >
              <li v-for="event in riskEvents" :key="event.id" class="relative">
                <span
                  class="absolute -left-[27px] top-1 inline-flex h-3 w-3 rounded-full bg-blue-600"
                ></span>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                  {{ formatDate(event.timestamp) }}
                  <template v-if="event.actor"> • {{ event.actor }}</template>
                </p>
                <p
                  class="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-1"
                >
                  {{ event.type }}
                </p>
                <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {{ event.details || 'No additional details provided.' }}
                </p>
              </li>
            </ol>
          </div>

          <RiskLogTab
            v-else-if="activeTab === 'log'"
            :entries="risk.riskLog?.entries"
          />
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showAssociationPicker"
      modal
      size="lg"
      :header="associationPickerTitle"
    >
      <div class="space-y-4">
        <input
          v-model="pickerSearch"
          type="text"
          placeholder="Search items..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
        />

        <div
          v-if="pickerLoading"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          Loading options...
        </div>

        <div
          v-else-if="!filteredPickerOptions.length"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          No available {{ associationLabel(pickerKind) }} to link.
        </div>

        <div v-else class="max-h-96 overflow-y-auto space-y-2">
          <button
            v-for="option in filteredPickerOptions"
            :key="option.id"
            class="w-full text-left border border-ccf-300 dark:border-slate-700 rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="linkAssociation(option)"
          >
            <p class="text-sm font-medium text-gray-800 dark:text-slate-200">
              {{ option.title }}
            </p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ pickerOptionSubtitle(option) }}
            </p>
          </button>
        </div>

        <div class="flex justify-end pt-2">
          <TertiaryButton @click="showAssociationPicker = false"
            >Close</TertiaryButton
          >
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { cloneFnJSON as cloneDeep } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import Message from '@/volt/Message.vue';
import Dialog from '@/volt/Dialog.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import RiskLogTab from '@/components/risk/RiskLogTab.vue';
import { useSystemStore } from '@/stores/system';
import type {
  Catalog,
  Control,
  Group,
  Profile,
  Risk,
  SystemComponent,
} from '@/oscal';
import type { Evidence } from '@/stores/evidence';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  resolveRiskContext,
  type RiskContext,
} from '@/utils/risk-context';
import {
  getRiskAssociations,
  normalizeRiskEvents,
  withUpdatedRiskAssociations,
  type RiskAssociationItem,
  type RiskAssociationKind,
  type RiskEventItem,
} from '@/utils/risk-detail';
import { getRiskIdentifier } from '@/utils/risk-id';

interface AssociationPickerOption extends RiskAssociationItem {
  subtitle?: string;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'controls', label: 'Controls' },
  { id: 'components', label: 'Components' },
  { id: 'history-events', label: 'History & Events' },
  { id: 'log', label: 'Log' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();

const riskId = computed(() => route.params.riskId as string | undefined);

const context = computed<RiskContext | null>(() =>
  resolveRiskContext({
    routeName: route.name,
    routeId: (route.params.id as string | undefined) ?? null,
    selectedPoamId: systemStore.system.poam?.uuid,
    selectedSspId: systemStore.system.securityPlan?.uuid,
  }),
);

const isSspRoute = computed(
  () =>
    route.name === 'system-security-plan-risks' ||
    route.name === 'system-security-plan-risk-detail' ||
    route.name === 'risks:index' ||
    route.name === 'risks:detail',
);

const missingContextTitle = computed(() =>
  isSspRoute.value
    ? 'System Security Plan context missing'
    : 'Plan of Action and Milestones context missing',
);
const missingContextDetail = computed(() =>
  isSspRoute.value
    ? 'Unable to determine the System Security Plan that owns this risk.'
    : 'Unable to determine the Plan of Action and Milestones that owns this risk.',
);

const contextMissing = computed(() => !context.value || !riskId.value);

const listEndpoint = computed(() => {
  if (!context.value) return null;
  return buildRiskCollectionEndpoint(context.value);
});

const {
  data: fetchedRisk,
  isLoading: loadingRisk,
  execute: executeFetchRisk,
} = useDataApi<Risk>(null, {}, { immediate: false });

const {
  data: fetchedRisks,
  isLoading: loadingRiskList,
  execute: executeFetchRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

const {
  data: savedRisk,
  isLoading: saving,
  execute: executeSave,
} = useDataApi<Risk>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const {
  data: fetchedEvents,
  isLoading: loadingEvents,
  execute: executeFetchEvents,
} = useDataApi<unknown>(null, {}, { immediate: false });

const {
  data: availableEvidence,
  isLoading: loadingEvidence,
  execute: executeLoadEvidence,
} = useDataApi<Evidence[]>(
  '/api/evidence/search',
  { method: 'POST' },
  { immediate: false },
);

const {
  data: availableComponents,
  isLoading: loadingComponents,
  execute: executeLoadComponents,
} = useDataApi<SystemComponent[]>(null, {}, { immediate: false });

const {
  data: profile,
  isLoading: loadingProfile,
  execute: executeLoadProfile,
} = useDataApi<Profile>(null, {}, { immediate: false });

const {
  data: resolvedCatalog,
  isLoading: loadingResolvedCatalog,
  execute: executeLoadResolvedCatalog,
} = useDataApi<Catalog>(null, {}, { immediate: false });

const risk = ref<Risk | null>(null);
const riskEvents = ref<RiskEventItem[]>([]);
const notFound = ref(false);
const loadError = ref('');

const activeTab = ref<TabId>('overview');

const resolvedRiskId = computed(
  () => getRiskIdentifier(risk.value) || riskId.value || '',
);

const detailEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskItemEndpoint(context.value, resolvedRiskId.value);
});

const pageTitle = computed(() =>
  risk.value?.title ? `Risk: ${risk.value.title}` : 'Risk Detail',
);

const loading = computed(
  () => loadingRisk.value || loadingRiskList.value || loadingEvents.value,
);

const associationFields = [
  'evidenceIds',
  'relatedEvidence',
  'evidence',
  'controlIds',
  'relatedControls',
  'controls',
  'componentIds',
  'relatedComponents',
  'components',
] as const;

function mergeSavedRiskForUi(nextRisk: Risk, returnedRisk?: Risk): Risk {
  if (!returnedRisk) return cloneDeep(nextRisk);

  const merged = {
    ...(nextRisk as unknown as Record<string, unknown>),
    ...(returnedRisk as unknown as Record<string, unknown>),
  } as Record<string, unknown>;
  const next = nextRisk as unknown as Record<string, unknown>;
  const returned = returnedRisk as unknown as Record<string, unknown>;

  associationFields.forEach((field) => {
    if (returned[field] === undefined && next[field] !== undefined) {
      merged[field] = cloneDeep(next[field]);
    }
  });

  return merged as unknown as Risk;
}

function isCanceledError(err: unknown): boolean {
  const maybeError = err as { message?: string; code?: string };
  return (
    maybeError?.code === 'ERR_CANCELED' ||
    maybeError?.message?.toLowerCase() === 'canceled'
  );
}

function extractErrorMessage(err: unknown): string {
  const maybeError = err as {
    message?: string;
    response?: { data?: { errors?: { body?: string } } };
  };

  return (
    maybeError?.response?.data?.errors?.body ||
    maybeError?.message ||
    'Unable to load risk.'
  );
}

const riskEventEndpoints = computed(() => {
  if (!context.value || !resolvedRiskId.value) return [];

  const base = buildRiskItemEndpoint(context.value, resolvedRiskId.value);
  return [
    `${base}/events`,
    `${base}/history`,
    `/api/oscal/risks/${resolvedRiskId.value}/events`,
    `/api/oscal/risk-register/risks/${resolvedRiskId.value}/events`,
  ];
});

async function loadRiskEvents() {
  if (!risk.value) {
    riskEvents.value = [];
    return;
  }

  for (const endpoint of riskEventEndpoints.value) {
    try {
      await executeFetchEvents(endpoint);
      riskEvents.value = normalizeRiskEvents(
        fetchedEvents.value,
        risk.value.riskLog?.entries,
      );
      if (riskEvents.value.length > 0) {
        return;
      }
    } catch (err) {
      if (isCanceledError(err)) return;
    }
  }

  riskEvents.value = normalizeRiskEvents([], risk.value.riskLog?.entries);
}

async function loadRisk() {
  loadError.value = '';
  notFound.value = false;
  risk.value = null;

  if (contextMissing.value || !detailEndpoint.value || !listEndpoint.value) {
    return;
  }

  try {
    await executeFetchRisk(detailEndpoint.value);
    if (fetchedRisk.value) {
      risk.value = cloneDeep(fetchedRisk.value);
    }
  } catch (err) {
    if (isCanceledError(err)) return;
  }

  if (!risk.value) {
    try {
      await executeFetchRisks(listEndpoint.value);
      const match = fetchedRisks.value?.find(
        (item) => getRiskIdentifier(item) === riskId.value,
      );
      if (match) {
        risk.value = cloneDeep(match);
      }
    } catch (err) {
      if (isCanceledError(err)) return;
      loadError.value = extractErrorMessage(err);
      return;
    }
  }

  if (!risk.value) {
    notFound.value = true;
    return;
  }

  await loadRiskEvents();
}

watch(
  [detailEndpoint, listEndpoint, riskId],
  () => {
    void loadRisk();
  },
  { immediate: true },
);

const evidenceAssociations = computed(() =>
  getRiskAssociations(risk.value, 'evidence'),
);
const controlAssociations = computed(() =>
  getRiskAssociations(risk.value, 'controls'),
);
const componentAssociations = computed(() =>
  getRiskAssociations(risk.value, 'components'),
);

function notifyRiskUpdated(updatedRisk: Risk) {
  if (typeof window === 'undefined' || !context.value) return;

  window.dispatchEvent(
    new CustomEvent('risk-updated', {
      detail: {
        risk: cloneDeep(updatedRisk),
        context: {
          scope: context.value.scope,
          id: context.value.id,
        },
        poamId: context.value.scope === 'poam' ? context.value.id : undefined,
        sspId: context.value.scope === 'ssp' ? context.value.id : undefined,
      },
    }),
  );
}

async function saveRisk(nextRisk: Risk, successMessage: string) {
  if (contextMissing.value || !detailEndpoint.value) return;

  try {
    await executeSave(detailEndpoint.value, {
      method: 'PUT',
      data: nextRisk,
    });

    const mergedRisk = mergeSavedRiskForUi(nextRisk, savedRisk.value);

    risk.value = mergedRisk;

    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: successMessage,
      life: 3000,
    });

    await loadRiskEvents();
  } catch (err) {
    if (isCanceledError(err)) return;

    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });

    throw err;
  }
}

const associationsSspId = computed(() => {
  if (context.value?.scope === 'ssp') {
    return context.value.id;
  }
  return systemStore.system.securityPlan?.uuid || '';
});

function flattenControls(
  catalog?: Catalog,
): Array<{ id: string; title: string; catalogName: string }> {
  if (!catalog) return [];

  const items: Array<{ id: string; title: string; catalogName: string }> = [];
  const catalogName = catalog.metadata?.title || catalog.uuid || 'Catalog';

  const pushControl = (control: Control) => {
    items.push({
      id: control.id,
      title: control.title || control.id,
      catalogName,
    });

    control.controls?.forEach(pushControl);
  };

  const walkGroup = (group: Group) => {
    group.controls?.forEach(pushControl);
    group.groups?.forEach(walkGroup);
  };

  catalog.controls?.forEach(pushControl);
  catalog.groups?.forEach(walkGroup);

  return items;
}

async function ensureEvidenceOptions() {
  if (availableEvidence.value?.length) return;
  const payload = {
    filter: {
      scope: {},
    },
  };

  await executeLoadEvidence({
    data: payload,
  });
}

async function ensureComponentOptions() {
  const sspId = associationsSspId.value;
  if (!sspId || availableComponents.value?.length) return;
  await executeLoadComponents(
    `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
  );
}

async function ensureControlOptions() {
  const sspId = associationsSspId.value;
  if (!sspId || resolvedCatalog.value) return;

  if (!profile.value) {
    await executeLoadProfile(
      `/api/oscal/system-security-plans/${sspId}/profile`,
    );
  }

  if (!profile.value?.uuid) return;

  await executeLoadResolvedCatalog(
    `/api/oscal/profiles/${profile.value.uuid}/resolved`,
  );
}

async function ensurePickerData(kind: RiskAssociationKind) {
  if (kind === 'evidence') {
    await ensureEvidenceOptions();
    return;
  }

  if (kind === 'controls') {
    await ensureControlOptions();
    return;
  }

  if (kind === 'components') {
    await ensureComponentOptions();
  }
}

const controlPickerOptions = computed<AssociationPickerOption[]>(() =>
  flattenControls(resolvedCatalog.value).map((item) => ({
    id: item.id,
    title: item.title,
    controlId: item.id,
    catalogName: item.catalogName,
    subtitle: `${item.catalogName} • ${item.id}`,
  })),
);

const componentPickerOptions = computed<AssociationPickerOption[]>(() =>
  (availableComponents.value || []).map((component) => ({
    id: component.uuid,
    title: component.title,
    type: component.type,
    description: component.description,
    subtitle: `${component.type || 'component'} • ${component.uuid}`,
  })),
);

const evidencePickerOptions = computed<AssociationPickerOption[]>(() =>
  (availableEvidence.value || []).map((item) => ({
    id: item.id || item.uuid,
    evidenceId: item.id,
    evidenceUuid: item.uuid,
    title: item.title || item.id || item.uuid,
    description: item.description,
    start: item.start,
    end: item.end,
    subtitle: item.id || item.uuid,
  })),
);

const showAssociationPicker = ref(false);
const pickerKind = ref<RiskAssociationKind>('evidence');
const pickerSearch = ref('');

const associationLabelMap: Record<RiskAssociationKind, string> = {
  evidence: 'Evidence',
  controls: 'Control',
  components: 'Component',
};

function associationLabel(kind: RiskAssociationKind): string {
  return associationLabelMap[kind];
}

const associationPickerTitle = computed(
  () => `Link ${associationLabel(pickerKind.value)}`,
);

const pickerLoading = computed(() => {
  switch (pickerKind.value) {
    case 'evidence':
      return loadingEvidence.value;
    case 'controls':
      return loadingProfile.value || loadingResolvedCatalog.value;
    case 'components':
      return loadingComponents.value;
    default:
      return false;
  }
});

const pickerOptions = computed<AssociationPickerOption[]>(() => {
  switch (pickerKind.value) {
    case 'evidence':
      return evidencePickerOptions.value;
    case 'controls':
      return controlPickerOptions.value;
    case 'components':
      return componentPickerOptions.value;
    default:
      return [];
  }
});

const linkedAssociationIds = computed(
  () =>
    new Set(
      getRiskAssociations(risk.value, pickerKind.value).map((item) => item.id),
    ),
);

const filteredPickerOptions = computed(() => {
  const search = pickerSearch.value.trim().toLowerCase();

  return pickerOptions.value.filter((option) => {
    if (linkedAssociationIds.value.has(option.id)) return false;

    if (!search) return true;

    const blob = [
      option.id,
      option.title,
      option.description,
      option.type,
      option.catalogName,
      option.controlId,
      option.subtitle,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return blob.includes(search);
  });
});

function pickerOptionSubtitle(option: AssociationPickerOption): string {
  if (option.subtitle) return option.subtitle;

  const parts = [
    option.type,
    option.catalogName,
    option.controlId,
    option.id,
  ].filter(Boolean);

  return parts.join(' • ');
}

async function openAssociationPicker(kind: RiskAssociationKind) {
  pickerKind.value = kind;
  pickerSearch.value = '';
  showAssociationPicker.value = true;

  try {
    await ensurePickerData(kind);
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function linkAssociation(item: AssociationPickerOption) {
  if (!risk.value) return;

  const current = getRiskAssociations(risk.value, pickerKind.value);
  if (current.some((entry) => entry.id === item.id)) return;

  const payload = withUpdatedRiskAssociations(
    cloneDeep(risk.value),
    pickerKind.value,
    [...current, item],
  );

  await saveRisk(payload, `${associationLabel(pickerKind.value)} linked`);
  showAssociationPicker.value = false;
}

async function unlinkAssociation(
  kind: RiskAssociationKind,
  id: string,
  title: string,
) {
  if (!risk.value) return;

  const confirmed = window.confirm(
    `Remove ${associationLabel(kind).toLowerCase()} "${title}" from this risk?`,
  );
  if (!confirmed) return;

  const current = getRiskAssociations(risk.value, kind);
  const payload = withUpdatedRiskAssociations(
    cloneDeep(risk.value),
    kind,
    current.filter((item) => item.id !== id),
  );

  await saveRisk(payload, `${associationLabel(kind)} removed`);
}

function controlRoute(item: RiskAssociationItem) {
  return {
    name: 'controls:index',
    query: {
      controlId: item.controlId || item.id,
    },
  };
}

function componentRoute(item: RiskAssociationItem) {
  return {
    name: 'system:components',
    query: {
      componentId: item.id,
    },
  };
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
</script>
