<template>
  <Message v-if="loading" severity="info" variant="simple">
    <span class="flex items-center gap-2">
      <i class="pi pi-spin pi-spinner"></i>
      Loading control data...
    </span>
  </Message>

  <Message
    v-else-if="!systemStore.system.securityPlan"
    severity="error"
    variant="outlined"
  >
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">System Security Plan not selected</h4>
      <p>You have not selected a system security plan for editing.</p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >SSP Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <Message v-else-if="!activeProfile" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">
        Your selected SSP does not have a linked profile
      </h4>
      <p>
        The System Security Plan you have selected does not have any linked
        profiles.
      </p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >System Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else>
    <div
      class="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <PageHeader>Controls</PageHeader>
        <PageSubHeader
          >Specify how controls are implemented across the business
        </PageSubHeader>
      </div>
      <Button
        type="button"
        severity="secondary"
        :label="bulkSuggestionsButtonLabel"
        :loading="bulkSuggestionsBusy"
        :disabled="bulkSuggestionsOperationLocked || catalogLoading || loading"
        @click="prepareApplyAllSuggestions"
      />
    </div>

    <Message v-if="!profilesResolved" severity="secondary">
      No catalog is available for the linked profile.
    </Message>
    <div v-else>
      <Tree
        v-model:expandedKeys="expandedKeys"
        :value="nodes"
        :filter="true"
        filterMode="lenient"
      >
        <template #group="slotProps">
          <div class="flex items-center gap-x-3">
            <h4>{{ slotProps.node.data.title }}</h4>
          </div>
        </template>
        <template #control="slotProps">
          <div
            :class="
              isHighlightedControl(slotProps.node.data.id)
                ? 'rounded ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20 p-2'
                : ''
            "
          >
            <div class="flex items-center gap-x-3">
              <Badge class="text-base">{{ slotProps.node.data.id }}</Badge>
              <h4>{{ slotProps.node.data.title }}</h4>
              <Badge class="text-base">{{
                controlByComponentCount(slotProps.node.data.id)
              }}</Badge>
              <Button
                variant="text"
                :disabled="!hasControlImplementation(slotProps.node.data.id)"
                :aria-label="
                  hasControlImplementation(slotProps.node.data.id)
                    ? 'View implementation'
                    : 'No implementation yet'
                "
                :title="
                  hasControlImplementation(slotProps.node.data.id)
                    ? 'View implementation'
                    : 'No implementation yet'
                "
                @click="openControlDrawer(slotProps.node.data.id)"
                ><BIconEye
              /></Button>
              <RiskIndicatorBadge
                :risk-count="controlRiskCount(slotProps.node.data.id)"
                :is-capped="
                  controlRiskCount(slotProps.node.data.id) >= RISK_FETCH_LIMIT
                "
                :highest-severity="
                  controlHighestSeverity(slotProps.node.data.id)
                "
                clickable
                @click.stop="openControlRisks(slotProps.node.data.id)"
              />
              <SuggestionIndicatorBadge
                v-if="aiConfigStore.dashboardSuggestionsEnabled"
                :count="controlSuggestionCount(slotProps.node.data.id)"
                @click.stop="openControlDrawer(slotProps.node.data.id)"
              />
              <ControlEvidenceCounter
                :control="slotProps.node.data"
                :ssp-id="systemStore.system.securityPlan?.uuid"
              />
            </div>
            <div class="py-4">
              <IndexControlImplementation
                :control="slotProps.node.data"
                :implementation="controlImplementations[slotProps.node.data.id]"
                @exported="handleExported"
                @imported="handleImported"
              />
            </div>
          </div>
        </template>
      </Tree>
    </div>
  </div>

  <Drawer
    v-model:visible="controlDrawerOpen"
    header="Implementation"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <ControlImplementationSuggestions
      v-if="aiConfigStore.dashboardSuggestionsEnabled"
      :control-id="selectedDrawerControlId"
      :ssp-id="systemStore.system.securityPlan?.uuid"
      :suggestions="selectedControlDashboardSuggestions"
      :result="selectedControlSuggestionResult"
      :loading="dashboardSuggestionStateLoading"
    />

    <div class="flex items-center mb-4 gap-x-4">
      <h4 class="font-medium text-xl">Components</h4>
      <Badge
        :value="selectedImplementedRequirement?.byComponents?.length"
        severity="info"
      />
    </div>
    <div
      v-for="(
        byComponent, index
      ) in selectedImplementedRequirement?.byComponents || []"
      :key="byComponent.uuid"
    >
      <div
        class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-4"
        v-if="index !== 0"
      ></div>
      <StatementByComponent
        :by-component="byComponent"
        :control-id="selectedImplementedRequirement?.controlId"
        :ssp-risks="sspRisks || []"
        :risk-fetch-limit="RISK_FETCH_LIMIT"
      />
    </div>

    <div class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-6"></div>

    <SharedResponsibilityPanel
      v-if="selectedSspId && selectedDrawerControlId"
      :key="`${selectedSspId}:${selectedDrawerControlId}:${sharedResponsibilityRefreshKey}`"
      :ssp-id="selectedSspId"
      :control-id="selectedDrawerControlId"
      @edit-provides="openProvidesEditor"
      @imported="handleImported"
    />

    <ExportStatementDialog
      v-if="selectedSspId && providesEditTarget"
      v-model:visible="showProvidesEditDialog"
      :ssp-id="selectedSspId"
      :ssp-title="selectedSspTitle"
      :control-id="providesEditTarget.controlId"
      :statement-id="providesEditTarget.statementId"
      :by-component-uuid="providesEditTarget.byComponentUuid"
      @saved="handleProvidesSaved"
    />
  </Drawer>
</template>

<script setup lang="ts">
import { onMounted, provide, ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import Message from '@/volt/Message.vue';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import {
  useSystemSecurityPlanStore,
  type SystemSecurityPlanProfileBinding,
} from '@/stores/system-security-plans';
import { useUIStore } from '@/stores/ui.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlEvidenceCounter from './partials/ControlEvidenceCounter.vue';
import { buildTreeNodesWithPrefix } from '@/composables/useCatalogTree';
import type { TreeNode } from '@/composables/useCatalogTree';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import {
  LeveragedControlsKey,
  useLeveragedControls,
} from '@/composables/useLeveragedControls';
import Tree from '@/volt/Tree.vue';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import ControlImplementationSuggestions from '@/views/control-implementations/partials/ControlImplementationSuggestions.vue';
import type { Catalog, Group } from '@/oscal';
import type { DataResponse } from '@/stores/types.ts';
import type {
  ControlImplementation,
  ImplementedRequirement,
  Risk,
  Statement,
} from '@/oscal';
import type {
  SharedResponsibilityProvided,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';
import Button from '@/volt/Button.vue';
import { BIconEye } from 'bootstrap-icons-vue';
import Drawer from '@/volt/Drawer.vue';
import ExportStatementDialog from '@/components/system-security-plans/ExportStatementDialog.vue';
import SharedResponsibilityPanel from './partials/SharedResponsibilityPanel.vue';
import StatementByComponent from './partials/StatementByComponent.vue';
import RiskIndicatorBadge from './partials/RiskIndicatorBadge.vue';
import SuggestionIndicatorBadge from './partials/SuggestionIndicatorBadge.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
  buildApplySuggestionsEndpoint,
  buildSuggestComponentsEndpoint,
  getUnappliedSuggestions,
  normalizeSuggestedComponentsResponse,
  type SuggestedComponent,
  type SystemComponentSuggestion,
} from '@/views/control-implementations/partials/component-suggestions';
import {
  getRiskControlIds,
  getRiskImpact,
  isClosedStatus,
} from '@/utils/risk-register';
import { getErrorDetail } from '@/utils/httpErrors';
import { useAiConfigStore } from '@/stores/ai-config';
import {
  buildDashboardSuggestionControlResultsEndpoint,
  buildDashboardSuggestionsEndpoint,
  DASHBOARD_SUGGESTION_LABEL_STOP_PATHS,
  type ControlSuggestionResult,
  type DashboardSuggestion,
} from '@/views/dashboard/partials/dashboard-suggestions';

const systemStore = useSystemStore();
const sspStore = useSystemSecurityPlanStore();
const uiStore = useUIStore();
const toast = useToast();
const confirm = useConfirm();
const axios = useAuthenticatedInstance();
const router = useRouter();
const aiConfigStore = useAiConfigStore();

const controlDrawerOpen = computed({
  get: () => uiStore.controlImplementationDrawerOpen,
  set: (val) => uiStore.setControlImplementationDrawerOpen(val),
});

const expandedKeys = computed({
  get: () => uiStore.controlImplementationExpandedKeys,
  set: (val) => uiStore.setControlImplementationExpandedKeys(val),
});

const profileBindings = ref<SystemSecurityPlanProfileBinding[]>([]);
const profileBindingsLoading = ref(false);
const activeProfile = computed(() => profileBindings.value[0] ?? null);
const profilesResolved = ref(false);
const catalogLoading = ref(false);
const {
  isLoading: controlImplementationLoading,
  execute: fetchControlImplementations,
} = useDataApi<ControlImplementation | null>(
  `/api/oscal/system-security-plans/${systemStore.system.securityPlan?.uuid}/control-implementation`,
  null,
  { immediate: false },
);
const loading = computed<boolean>(
  () =>
    profileBindingsLoading.value ||
    catalogLoading.value ||
    controlImplementationLoading.value,
);

const controlImplementations = ref<{ [key: string]: ImplementedRequirement }>(
  {},
);
const selectedImplementedRequirement = ref<ImplementedRequirement>();
// The control whose drawer is open. Tracked separately from the implemented
// requirement so the drawer (and its AI suggestions panel) can open for a
// control that has pending suggestions but no implementation yet.
const selectedControlId = ref<string>();
const RISK_FETCH_LIMIT = 100;
const loadedSspRisksFor = ref<string | null>(null);
const preparingBulkSuggestions = ref(false);
const applyingBulkSuggestions = ref(false);
const bulkSuggestionsConfirmOpen = ref(false);
const BULK_SUGGESTIONS_CONCURRENCY_LIMIT = 5;

const error = ref<unknown>(null);
const { data: sspRisks, execute: loadSspRisks } = useDataApi<Risk[]>(
  null,
  {},
  { immediate: false },
);
const pendingDashboardSuggestions = ref<DashboardSuggestion[]>([]);
const dashboardSuggestionControlResults = ref<ControlSuggestionResult[]>([]);
const dashboardSuggestionStateLoading = ref(false);

const nodes = ref<Array<TreeNode>>([]);
const loadedDashboardSuggestionStateFor = ref<string | null>(null);
const loadingDashboardSuggestionStateFor = ref<string | null>(null);
let dashboardSuggestionStateLoadPromise: Promise<void> | null = null;
const dashboardSuggestionStateRequestId = ref(0);

interface StatementSuggestionWorkItem {
  requirement: ImplementedRequirement;
  statement: Statement;
  suggestions: SuggestedComponent[];
  unappliedSuggestions: SuggestedComponent[];
}

interface StatementSuggestionPlan {
  items: StatementSuggestionWorkItem[];
  failedFetchCount: number;
}

const bulkSuggestionsBusy = computed(
  () => preparingBulkSuggestions.value || applyingBulkSuggestions.value,
);
const bulkSuggestionsOperationLocked = computed(
  () => bulkSuggestionsBusy.value || bulkSuggestionsConfirmOpen.value,
);
const bulkSuggestionsButtonLabel = computed(() => {
  if (applyingBulkSuggestions.value) {
    return 'Applying Suggestions...';
  }
  if (preparingBulkSuggestions.value) {
    return 'Preparing Suggestions...';
  }
  return 'Apply All Suggestions';
});

const pendingDashboardSuggestionsByControl = computed(() => {
  const grouped: Record<string, DashboardSuggestion[]> = {};
  for (const suggestion of pendingDashboardSuggestions.value ?? []) {
    const key = normalizeId(suggestion.controlId);
    if (!key) {
      continue;
    }
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(suggestion);
  }
  return grouped;
});

const dashboardSuggestionResultsByControl = computed(() => {
  const results: Record<string, ControlSuggestionResult> = {};
  for (const result of dashboardSuggestionControlResults.value ?? []) {
    const key = normalizeId(result.controlId);
    if (!key) {
      continue;
    }
    results[key] = result;
  }
  return results;
});

const selectedDrawerControlId = computed(
  () =>
    selectedControlId.value ?? selectedImplementedRequirement.value?.controlId,
);

const selectedControlDashboardSuggestions = computed(() => {
  const key = normalizeId(selectedDrawerControlId.value);
  return key ? (pendingDashboardSuggestionsByControl.value[key] ?? []) : [];
});

const selectedControlSuggestionResult = computed(() => {
  const key = normalizeId(selectedDrawerControlId.value);
  return key ? dashboardSuggestionResultsByControl.value[key] : undefined;
});

function controlSuggestionCount(controlId?: string): number {
  const key = normalizeId(controlId);
  return key
    ? (pendingDashboardSuggestionsByControl.value[key]?.length ?? 0)
    : 0;
}

function normalizeId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function impactRank(level?: string): number {
  const normalized = normalizeId(level);
  if (normalized === 'critical' || normalized === 'high') return 3;
  if (normalized === 'medium' || normalized === 'moderate') return 2;
  if (normalized === 'low') return 1;
  return 0;
}

function levelFromRank(rank: number): 'high' | 'medium' | 'low' | undefined {
  if (rank >= 3) return 'high';
  if (rank === 2) return 'medium';
  if (rank === 1) return 'low';
  return undefined;
}

const controlRiskStats = computed(() => {
  const map = new Map<
    string,
    { count: number; highestSeverity?: 'high' | 'medium' | 'low' }
  >();

  for (const risk of sspRisks.value || []) {
    if (isClosedStatus(risk.status)) continue;
    const controlIds = Array.from(
      new Set(
        getRiskControlIds(risk)
          .map((id) => normalizeId(id))
          .filter(Boolean),
      ),
    );
    const rank = impactRank(getRiskImpact(risk));

    for (const controlId of controlIds) {
      const existing = map.get(controlId);
      if (!existing) {
        map.set(controlId, {
          count: 1,
          highestSeverity: levelFromRank(rank),
        });
        continue;
      }

      existing.count += 1;
      const existingRank = impactRank(existing.highestSeverity);
      if (rank > existingRank) {
        existing.highestSeverity = levelFromRank(rank);
      }
    }
  }

  return map;
});

function controlRiskCount(controlId?: string): number {
  if (!controlId) return 0;
  return controlRiskStats.value.get(normalizeId(controlId))?.count ?? 0;
}

function controlHighestSeverity(
  controlId?: string,
): 'high' | 'medium' | 'low' | undefined {
  if (!controlId) return undefined;
  const stats = controlRiskStats.value.get(normalizeId(controlId));
  if (!stats || stats.count === 0) {
    return undefined;
  }
  // If impact metadata is missing, still render as alerting instead of neutral.
  return stats.highestSeverity ?? 'high';
}

async function loadDashboardSuggestionState() {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId || !aiConfigStore.dashboardSuggestionsEnabled) {
    pendingDashboardSuggestions.value = [];
    dashboardSuggestionControlResults.value = [];
    loadedDashboardSuggestionStateFor.value = null;
    loadingDashboardSuggestionStateFor.value = null;
    dashboardSuggestionStateLoadPromise = null;
    dashboardSuggestionStateRequestId.value += 1;
    dashboardSuggestionStateLoading.value = false;
    return;
  }

  if (loadedDashboardSuggestionStateFor.value === sspId) {
    return;
  }

  if (
    loadingDashboardSuggestionStateFor.value === sspId &&
    dashboardSuggestionStateLoadPromise
  ) {
    await dashboardSuggestionStateLoadPromise;
    return;
  }

  loadingDashboardSuggestionStateFor.value = sspId;
  dashboardSuggestionStateLoading.value = true;
  const requestId = (dashboardSuggestionStateRequestId.value += 1);
  const loadPromise = (async () => {
    const [pendingResult, controlResultsResult] = await Promise.allSettled([
      axios.get<DataResponse<DashboardSuggestion[]>>(
        buildDashboardSuggestionsEndpoint(sspId, 'pending'),
        {
          camelcaseStopPaths: DASHBOARD_SUGGESTION_LABEL_STOP_PATHS,
        },
      ),
      axios.get<DataResponse<ControlSuggestionResult[]>>(
        buildDashboardSuggestionControlResultsEndpoint(sspId),
      ),
    ]);

    if (
      dashboardSuggestionStateRequestId.value !== requestId ||
      systemStore.system.securityPlan?.uuid !== sspId
    ) {
      return;
    }

    pendingDashboardSuggestions.value =
      pendingResult.status === 'fulfilled' ? pendingResult.value.data.data : [];
    dashboardSuggestionControlResults.value =
      controlResultsResult.status === 'fulfilled'
        ? controlResultsResult.value.data.data
        : [];
    loadedDashboardSuggestionStateFor.value = sspId;
  })();
  dashboardSuggestionStateLoadPromise = loadPromise;

  try {
    await loadPromise;
  } finally {
    if (
      loadingDashboardSuggestionStateFor.value === sspId &&
      dashboardSuggestionStateLoadPromise === loadPromise
    ) {
      loadingDashboardSuggestionStateFor.value = null;
      dashboardSuggestionStateLoadPromise = null;
      dashboardSuggestionStateLoading.value = false;
    }
  }
}

async function initializeDashboardSuggestionState() {
  try {
    await aiConfigStore.fetchDashboardSuggestionsConfig();
    if (aiConfigStore.dashboardSuggestionsEnabled) {
      await loadDashboardSuggestionState();
    }
  } catch {
    // Dashboard suggestions are optional; do not block the core controls view.
  }
}

function openControlRisks(controlId?: string) {
  if (!controlId) {
    return;
  }
  void router.push({
    name: 'risks:index',
    query: {
      controlId,
    },
  });
}

function controlByComponentCount(controlId?: string): number {
  if (!controlId) {
    return 0;
  }
  const requirement = controlImplementations.value[controlId];
  if (!requirement) {
    return 0;
  }

  return (requirement.statements ?? []).reduce(
    (count, statement) => count + (statement.byComponents?.length ?? 0),
    requirement.byComponents?.length ?? 0,
  );
}

function getStatementWorkItems(): Array<{
  requirement: ImplementedRequirement;
  statement: Statement;
}> {
  const items: Array<{
    requirement: ImplementedRequirement;
    statement: Statement;
  }> = [];
  for (const requirement of Object.values(controlImplementations.value)) {
    for (const statement of requirement.statements ?? []) {
      if (!statement.uuid) {
        continue;
      }
      items.push({ requirement, statement });
    }
  }
  return items;
}

async function loadControlImplementations() {
  const { data: implementationResponse } = await fetchControlImplementations();
  const implementation = implementationResponse?.value?.data;
  if (!implementation) {
    controlImplementations.value = {};
    selectedImplementedRequirement.value = undefined;
    uiStore.controlImplementationSelectedRequirementId = null;
    uiStore.controlImplementationDrawerOpen = false;
    return;
  }

  const nextMap: { [key: string]: ImplementedRequirement } = {};
  let selectedRequirementFound = false;
  for (const impl of implementation.implementedRequirements) {
    nextMap[impl.controlId] = impl;
    if (
      uiStore.controlImplementationSelectedRequirementId === impl.uuid &&
      uiStore.controlImplementationDrawerOpen
    ) {
      selectedImplementedRequirement.value = impl;
      selectedControlId.value = impl.controlId;
      selectedRequirementFound = true;
    }
  }
  if (
    uiStore.controlImplementationDrawerOpen &&
    uiStore.controlImplementationSelectedRequirementId &&
    !selectedRequirementFound
  ) {
    selectedImplementedRequirement.value = undefined;
    uiStore.controlImplementationSelectedRequirementId = null;
    uiStore.controlImplementationDrawerOpen = false;
  }
  controlImplementations.value = nextMap;
}

async function loadProfileBindings() {
  const sspId = systemStore.system.securityPlan?.uuid;
  profileBindings.value = [];
  profilesResolved.value = false;
  nodes.value = [];

  if (!sspId) {
    return;
  }

  profileBindingsLoading.value = true;
  try {
    const result = await sspStore.listProfiles(sspId);
    profileBindings.value = result.data || [];
  } catch (err) {
    if (err instanceof Response && err.status === 404) {
      return;
    }
    throw err;
  } finally {
    profileBindingsLoading.value = false;
  }
}

async function loadResolvedProfileCatalogs() {
  profilesResolved.value = false;
  nodes.value = [];

  if (profileBindings.value.length === 0) {
    return;
  }

  catalogLoading.value = true;
  try {
    const results = await Promise.allSettled(
      profileBindings.value.map(async (profileBinding) => {
        const response = await axios.get<DataResponse<Catalog>>(
          `/api/oscal/profiles/${profileBinding.uuid}/resolved`,
        );
        return { profileBinding, resolvedCatalog: response.data?.data };
      }),
    );

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Error Loading Catalogs',
        detail: `Failed to load resolved catalog for ${failedCount} profile${failedCount > 1 ? 's' : ''}.`,
        life: 3000,
      });
    }

    const profileNodes = results.flatMap((result) => {
      if (result.status !== 'fulfilled' || !result.value.resolvedCatalog) {
        return [];
      }
      const { profileBinding, resolvedCatalog } = result.value;
      return [
        {
          key: `profile:${profileBinding.uuid}`,
          label: profileBinding.title,
          type: 'group',
          data: {
            id: profileBinding.uuid,
            title: profileBinding.title,
          } as Group,
          children: buildTreeNodesWithPrefix(
            resolvedCatalog,
            `profile:${profileBinding.uuid}`,
          ),
        },
      ];
    });

    nodes.value = profileNodes;
    profilesResolved.value = profileNodes.length > 0;
  } finally {
    catalogLoading.value = false;
  }
}

async function buildStatementSuggestionPlan(): Promise<StatementSuggestionPlan> {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId) {
    return {
      items: [],
      failedFetchCount: 0,
    };
  }

  const statements = getStatementWorkItems();
  let failedFetchCount = 0;
  const planned = await mapWithConcurrency(
    statements,
    BULK_SUGGESTIONS_CONCURRENCY_LIMIT,
    async ({ requirement, statement }) => {
      try {
        const response = await axios.post<{
          data: SystemComponentSuggestion[];
        }>(
          buildSuggestComponentsEndpoint(
            sspId,
            requirement.uuid,
            statement.uuid,
          ),
        );
        const suggestions = normalizeSuggestedComponentsResponse(
          response.data.data,
        );
        return {
          requirement,
          statement,
          suggestions,
          unappliedSuggestions: getUnappliedSuggestions(
            statement.byComponents,
            suggestions,
          ),
        } as StatementSuggestionWorkItem;
      } catch (error) {
        failedFetchCount += 1;
        console.error('Failed to fetch statement component suggestions:', {
          requirementUuid: requirement.uuid,
          statementUuid: statement.uuid,
          error,
        });
        return {
          requirement,
          statement,
          suggestions: [],
          unappliedSuggestions: [],
        } as StatementSuggestionWorkItem;
      }
    },
  );

  return {
    items: planned.filter((item) => item.unappliedSuggestions.length > 0),
    failedFetchCount,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  iteratorFn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!items.length) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await iteratorFn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: safeLimit }, () => worker()));
  return results;
}

async function applySuggestionPlan(
  plannedItems: StatementSuggestionWorkItem[],
) {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId) {
    return;
  }

  applyingBulkSuggestions.value = true;
  let createdCount = 0;
  let failedCount = 0;
  try {
    const outcomes = await mapWithConcurrency(
      plannedItems,
      BULK_SUGGESTIONS_CONCURRENCY_LIMIT,
      async (item) => {
        const suggestionCount = item.unappliedSuggestions.length;
        try {
          await axios.post(
            buildApplySuggestionsEndpoint(
              sspId,
              item.requirement.uuid,
              item.statement.uuid,
            ),
          );
          return {
            appliedCount: suggestionCount,
            failedCount: 0,
          };
        } catch (error) {
          console.error('Failed to apply suggested components for statement:', {
            requirementUuid: item.requirement.uuid,
            statementUuid: item.statement.uuid,
            suggestionsAttempted: suggestionCount,
            error,
          });
          return {
            appliedCount: 0,
            failedCount: suggestionCount,
          };
        }
      },
    );
    createdCount = outcomes.reduce(
      (sum, outcome) => sum + outcome.appliedCount,
      0,
    );
    failedCount = outcomes.reduce(
      (sum, outcome) => sum + outcome.failedCount,
      0,
    );
  } finally {
    try {
      await loadControlImplementations();
    } catch (error) {
      console.error('Failed to refresh control implementations:', error);
      toast.add({
        severity: 'error',
        summary: 'Refresh Failed',
        detail:
          'Some suggestions may have been applied, but the page failed to refresh automatically.',
        life: 5000,
      });
    }

    if (createdCount > 0 && failedCount === 0) {
      toast.add({
        severity: 'success',
        summary: 'Suggestions Applied',
        detail: `${createdCount} suggested component${createdCount === 1 ? '' : 's'} added across statements.`,
        life: 4000,
      });
    } else if (createdCount > 0 && failedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partially Applied',
        detail: `${createdCount} suggestion${createdCount === 1 ? '' : 's'} added, ${failedCount} failed.`,
        life: 5000,
      });
    } else if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Bulk Apply Failed',
        detail: `${failedCount} suggestion${failedCount === 1 ? '' : 's'} failed to apply.`,
        life: 5000,
      });
    }

    applyingBulkSuggestions.value = false;
  }
}

async function prepareApplyAllSuggestions() {
  if (bulkSuggestionsOperationLocked.value) {
    return;
  }

  preparingBulkSuggestions.value = true;
  try {
    const { items: plannedItems, failedFetchCount } =
      await buildStatementSuggestionPlan();
    const suggestionsToAdd = plannedItems.reduce(
      (sum, item) => sum + item.unappliedSuggestions.length,
      0,
    );

    if (failedFetchCount > 0) {
      const failedLabel = failedFetchCount === 1 ? 'statement' : 'statements';
      toast.add({
        severity: 'warn',
        summary: 'Some Suggestions Could Not Be Loaded',
        detail: `${failedFetchCount} ${failedLabel} failed to load suggestions. Results may be incomplete.`,
        life: 4500,
      });
    }

    if (suggestionsToAdd === 0) {
      if (failedFetchCount > 0) {
        return;
      }
      toast.add({
        severity: 'info',
        summary: 'No Pending Suggestions',
        detail: 'All current statement suggestions are already applied.',
        life: 3000,
      });
      return;
    }

    bulkSuggestionsConfirmOpen.value = true;
    confirm.require({
      header: 'Apply All Suggestions',
      message: `Apply ${suggestionsToAdd} suggested component${suggestionsToAdd === 1 ? '' : 's'} across ${plannedItems.length} statement${plannedItems.length === 1 ? '' : 's'}?`,
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: 'Apply',
      },
      accept: async () => {
        try {
          await applySuggestionPlan(plannedItems);
        } finally {
          bulkSuggestionsConfirmOpen.value = false;
        }
      },
      reject: () => {
        bulkSuggestionsConfirmOpen.value = false;
      },
    });
  } catch (bulkError) {
    bulkSuggestionsConfirmOpen.value = false;
    toast.add({
      severity: 'error',
      summary: 'Unable to Load Suggestions',
      detail:
        bulkError instanceof Error
          ? bulkError.message
          : 'Unexpected error loading component suggestions.',
      life: 4000,
    });
  } finally {
    preparingBulkSuggestions.value = false;
  }
}

watch(profileBindings, async () => {
  if (profileBindings.value.length === 0) {
    profilesResolved.value = false;
    nodes.value = [];
    return;
  }

  try {
    await loadResolvedProfileCatalogs();
  } catch (err) {
    error.value = err;
    toast.add({
      severity: 'error',
      summary: 'Error Loading Catalogs',
      detail: await getErrorDetail(
        err,
        'An error occurred while loading profile catalogs.',
      ),
      life: 3000,
    });
  }
});

function hasControlImplementation(controlId?: string): boolean {
  return !!(controlId && controlImplementations.value[controlId]);
}

const selectedSspId = computed(
  () => systemStore.system.securityPlan?.uuid ?? '',
);

// One leveraged-controls fetch for the whole page — every statement card (and the
// statement drawer) injects this instead of refetching per control.
const leveragedControls = useLeveragedControls(
  computed(() => systemStore.system.securityPlan?.uuid),
);
provide(LeveragedControlsKey, leveragedControls);

// ---- Shared responsibility: editing what this SSP provides ----

const selectedSspTitle = computed(
  () => systemStore.system.securityPlan?.metadata?.title ?? 'This system',
);

const showProvidesEditDialog = ref(false);
const providesEditTarget = ref<{
  controlId: string;
  statementId: string;
  byComponentUuid: string;
} | null>(null);
// Bumped to re-key (and so re-fetch) the SharedResponsibilityPanel after a save.
const sharedResponsibilityRefreshKey = ref(0);

// The rollup row carries the controlId/statementId/byComponentUuid the export dialog needs;
// it resolves the live OSCAL uuids itself, so nothing here depends on what happens to be
// loaded in the tree.
function openProvidesEditor(row: SharedResponsibilityProvided) {
  providesEditTarget.value = {
    controlId: row.controlId,
    statementId: row.statementId,
    byComponentUuid: row.byComponentUuid,
  };
  showProvidesEditDialog.value = true;
}

async function handleProvidesSaved() {
  sharedResponsibilityRefreshKey.value += 1;
  await loadControlImplementations();
}

async function handleExported() {
  sharedResponsibilityRefreshKey.value += 1;
  await loadControlImplementations();
}

// ---- Shared responsibility: importing an upstream implementation ----

const highlightedControlIds = ref(new Set<string>());

function isHighlightedControl(controlId?: string): boolean {
  return !!controlId && highlightedControlIds.value.has(normalizeId(controlId));
}

// Tree keys are hierarchical paths (profile:<id>:group:<id>:control:<id>), so revealing a
// control means expanding every ancestor on the way down to it.
function expandPathToControl(controlId: string) {
  const target = normalizeId(controlId);
  const nextExpanded = { ...expandedKeys.value };

  const walk = (node: TreeNode, ancestors: string[]): boolean => {
    const path = [...ancestors, node.key];
    if (node.type === 'control' && normalizeId(node.data.id) === target) {
      for (const key of path) {
        nextExpanded[key] = true;
      }
      return true;
    }
    return (node.children ?? []).some((child) => walk(child, path));
  };

  const found = nodes.value.some((node) => walk(node, []));
  if (found) {
    expandedKeys.value = nextExpanded;
  }
}

async function handleImported(payload: { meta?: SubscribeResponseMeta }) {
  // `created: false` rows were reused, not created — announcing them would claim work the
  // subscribe didn't do.
  const created = payload.meta?.created;
  const newRequirements = (created?.implementedRequirements ?? []).filter(
    (r) => r.created,
  );
  const newStatements = (created?.statements ?? []).filter((s) => s.created);

  await loadControlImplementations();
  sharedResponsibilityRefreshKey.value += 1;
  await leveragedControls.refresh();

  // Statements don't carry a controlId of their own — the requirements list does (it
  // includes reused rows precisely so this join always resolves).
  const controlIdByRequirementUuid = new Map(
    (created?.implementedRequirements ?? []).map((r) => [r.uuid, r.controlId]),
  );
  const revealed = [
    ...newRequirements.map((r) => r.controlId),
    ...newStatements
      .map((s) => controlIdByRequirementUuid.get(s.implementedRequirementUuid))
      .filter((id): id is string => !!id),
  ];
  for (const controlId of revealed) {
    expandPathToControl(controlId);
  }
  highlightedControlIds.value = new Set(revealed.map((id) => normalizeId(id)));

  // A merged payload (importing from several offerings at once) can repeat rows — a Set
  // keeps the toast from stuttering.
  const parts = new Set<string>();
  for (const requirement of newRequirements) {
    parts.add(`implemented requirement ${requirement.controlId}`);
  }
  for (const statement of newStatements) {
    parts.add(`statement ${statement.statementId}`);
  }

  if (!parts.size) {
    toast.add({
      severity: 'success',
      summary: 'Implementation imported',
      detail:
        'The upstream capability was inherited into existing requirements — nothing new was created.',
      life: 4000,
    });
    return;
  }

  toast.add({
    severity: 'success',
    summary: 'Implementation imported',
    detail: `Created ${[...parts].join(' and ')}.`,
    life: 6000,
  });
}

// Opens the implementation drawer for a control. The control need not have an
// implementation: when it only has pending AI suggestions, the drawer still
// opens (with an empty Components section) so the suggestions panel is reachable.
function openControlDrawer(controlId?: string) {
  if (!controlId) {
    return;
  }
  const requirement = controlImplementations.value[controlId];
  uiStore.setControlImplementationDrawerOpen(true);
  uiStore.setControlImplementationSelectedRequirementId(
    requirement?.uuid ?? null,
  );
  selectedControlId.value = controlId;
  selectedImplementedRequirement.value = requirement;
  void loadDashboardSuggestionState();
}

watch(
  () => systemStore.system.securityPlan?.uuid,
  async (sspId) => {
    if (!sspId) {
      sspRisks.value = [];
      loadedSspRisksFor.value = null;
      pendingDashboardSuggestions.value = [];
      dashboardSuggestionControlResults.value = [];
      loadedDashboardSuggestionStateFor.value = null;
      loadingDashboardSuggestionStateFor.value = null;
      dashboardSuggestionStateLoadPromise = null;
      dashboardSuggestionStateRequestId.value += 1;
      dashboardSuggestionStateLoading.value = false;
      return;
    }

    if (loadedSspRisksFor.value === sspId) {
      return;
    }

    const query = new URLSearchParams({ limit: `${RISK_FETCH_LIMIT}` });
    const endpoint = `/api/oscal/system-security-plans/${sspId}/risks?${query.toString()}`;

    try {
      await loadSspRisks(endpoint);
      loadedSspRisksFor.value = sspId;
    } catch {
      // Error state is already handled by useDataApi.
    }
  },
  { immediate: true },
);

watch(
  () => [
    systemStore.system.securityPlan?.uuid,
    aiConfigStore.dashboardSuggestionsConfigFetched,
    aiConfigStore.dashboardSuggestionsEnabled,
  ],
  ([sspId, configFetched, enabled]) => {
    if (!sspId || !configFetched || !enabled) {
      pendingDashboardSuggestions.value = [];
      dashboardSuggestionControlResults.value = [];
      loadedDashboardSuggestionStateFor.value = null;
      loadingDashboardSuggestionStateFor.value = null;
      dashboardSuggestionStateLoadPromise = null;
      dashboardSuggestionStateRequestId.value += 1;
      dashboardSuggestionStateLoading.value = false;
      return;
    }
    void loadDashboardSuggestionState();
  },
);

watch(
  () => uiStore.controlImplementationDrawerOpen,
  (isOpen) => {
    if (!isOpen) {
      if (uiStore.controlImplementationSelectedRequirementId) {
        uiStore.setControlImplementationSelectedRequirementId(null);
      }
      selectedImplementedRequirement.value = undefined;
      selectedControlId.value = undefined;
      // The import highlight is meant to be transient — "here is the requirement that just
      // appeared" — not a permanent badge the user meets again in a later session.
      highlightedControlIds.value = new Set();
    }
  },
);

onMounted(async () => {
  void initializeDashboardSuggestionState();

  try {
    await loadProfileBindings();
    if (profileBindings.value.length > 0) {
      catalogLoading.value = true;
    }
  } catch (err) {
    error.value = err;
    toast.add({
      severity: 'error',
      summary: 'Error Loading Profile Bindings',
      detail: await getErrorDetail(
        err,
        'An error occurred while loading the profiles linked to this SSP.',
      ),
      life: 3000,
    });
  }

  try {
    await loadControlImplementations();
  } catch (err) {
    error.value = err;
  }
});
</script>
