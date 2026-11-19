<script setup lang="ts">
/**
 * This System > Implementation (/systems/:systemId/implementation): which profiles the system
 * implements, every control they bring in (grouped as in the catalog, searchable), how each is
 * implemented, and a drawer with a control's component statements, AI suggestions and shared
 * responsibilities. The data logic is the classic page's, unchanged.
 */
import { computed as dsComputed, ref as dsRef } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import LinkedColumnsHeader from '@/ds/components/LinkedColumns/LinkedColumnsHeader.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import ControlLinkRow from './ControlLinkRow.vue';
import ControlView from './ControlView.vue';
import { controlSections } from './controlSections';
import ProfilesField from './ProfilesField.vue';
import { LINK_COLUMNS, provideControlTree } from './controlTree';
import { onMounted, provide, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSystemStore } from '@/stores/system.ts';
import {
  useSystemSecurityPlanStore,
  type SystemSecurityPlanProfileBinding,
} from '@/stores/system-security-plans';
import { useUIStore } from '@/stores/ui.ts';
import { buildTreeNodesWithPrefix } from '@/composables/useCatalogTree';
import type { TreeNode } from '@/composables/useCatalogTree';
import {
  decamelizeKeys,
  useAuthenticatedInstance,
  useDataApi,
} from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import {
  LeveragedControlsKey,
  useLeveragedControls,
} from '@/composables/useLeveragedControls';
import ControlSuggestions from './ControlSuggestions.vue';
import type { Catalog, Group } from '@/oscal';
import type { DataResponse } from '@/stores/types.ts';
import type {
  ByComponent,
  Control,
  ControlImplementation,
  ImplementedRequirement,
  Risk,
  Statement,
  SystemComponent,
} from '@/oscal';
import type { Dashboard } from '@/stores/filters';
import type {
  SharedResponsibilityProvided,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';
import ExportStatementDialog from '@/components/system-security-plans/ExportStatementDialog.vue';
import SharedResponsibilityPanel from '@/views/control-implementations/partials/SharedResponsibilityPanel.vue';
import ByComponentStatement from './ByComponentStatement.vue';
import { useToast } from '@/ds/toasts';
import { useConfirm } from '@/ds/confirm';
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
const aiConfigStore = useAiConfigStore();

const controlDrawerOpen = computed({
  get: () => uiStore.controlImplementationDrawerOpen,
  set: (val) => uiStore.setControlImplementationDrawerOpen(val),
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
    return 'Applying suggestions…';
  }
  if (preparingBulkSuggestions.value) {
    return 'Preparing suggestions…';
  }
  return 'Apply all suggestions';
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

// Flattens the catalog tree once per rebuild so the drawer can look up a
// control's title/description by id, regardless of whether it was opened by
// clicking a row or restored from persisted drawer state on page load.
const controlsById = computed(() => {
  const map: Record<string, Control> = {};
  const walk = (node: TreeNode) => {
    if (node.type === 'control') {
      const control = node.data as Control;
      map[normalizeId(control.id)] = control;
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  for (const node of nodes.value) {
    walk(node);
  }
  return map;
});

const selectedControl = computed<Control | undefined>(() => {
  const key = normalizeId(selectedDrawerControlId.value);
  return key ? controlsById.value[key] : undefined;
});

const selectedControlDescription = computed(() => {
  const statementPart = selectedControl.value?.parts?.find(
    (part) => part.name === 'statement',
  );
  return statementPart?.prose ?? '';
});

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

// By-component statements in the drawer ---------------------------------------------------------
// (The classic drawer rendered these without save or delete handlers, so its Edit and Delete did
// nothing.)

const { can } = usePermissions();
const statementEditDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing this security plan.",
);

/**
 * Every component statement for the selected control: on the requirement itself, and on each of
 * its statements (where most live). The classic drawer listed only the first kind, so it showed
 * "Components (0)" for controls the tree counted as implemented.
 */
const drawerByComponents = computed(() => {
  const requirement = selectedImplementedRequirement.value;
  if (!requirement) return [];
  return [
    ...(requirement.byComponents ?? []).map((byComponent) => ({
      byComponent,
      statementId: undefined as string | undefined,
    })),
    ...(requirement.statements ?? []).flatMap((statement) =>
      (statement.byComponents ?? []).map((byComponent) => ({
        byComponent,
        statementId: statement.uuid as string | undefined,
      })),
    ),
  ];
});

function byComponentUrl(
  byComponent: ByComponent,
  statementId?: string,
): string | undefined {
  const sspId = systemStore.system.securityPlan?.uuid;
  const requirement = selectedImplementedRequirement.value;
  if (!sspId || !requirement) return undefined;
  const base = `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${requirement.uuid}`;
  return statementId
    ? `${base}/statements/${statementId}/by-components/${byComponent.uuid}`
    : `${base}/by-components/${byComponent.uuid}`;
}

async function saveByComponent(byComponent: ByComponent, statementId?: string) {
  const url = byComponentUrl(byComponent, statementId);
  if (!url) return;
  try {
    await axios.put(url, byComponent, { transformRequest: [decamelizeKeys] });
    await loadControlImplementations();
    toast.add({
      severity: 'success',
      summary: 'Statement saved',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The statement wasn't saved",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

async function deleteByComponent(
  byComponent: ByComponent,
  statementId?: string,
) {
  const url = byComponentUrl(byComponent, statementId);
  if (!url) return;
  try {
    await axios.delete(url);
    await loadControlImplementations();
    toast.add({
      severity: 'success',
      summary: 'Statement deleted',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The statement wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
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

// Profile changes from the picker can trigger overlapping reloads. Each load takes a
// token and only the latest one may write its result, so a slow earlier response can't
// replace the bindings (or the tree) from a newer selection.
let profileBindingsLoadToken = 0;
let catalogLoadToken = 0;

// keepCurrent leaves the current bindings and tree on screen until the replacement
// arrives (and keeps them if the request fails), for reloads after a profile change.
async function loadProfileBindings(options: { keepCurrent?: boolean } = {}) {
  const token = ++profileBindingsLoadToken;
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!options.keepCurrent) {
    profileBindings.value = [];
    profilesResolved.value = false;
    nodes.value = [];
  }

  if (!sspId) {
    return;
  }

  profileBindingsLoading.value = true;
  try {
    const result = await sspStore.listProfiles(sspId);
    if (token !== profileBindingsLoadToken) return;
    profileBindings.value = result.data || [];
  } catch (err) {
    if (token !== profileBindingsLoadToken) return;
    if (err instanceof Response && err.status === 404) {
      profileBindings.value = [];
      return;
    }
    throw err;
  } finally {
    if (token === profileBindingsLoadToken) {
      profileBindingsLoading.value = false;
    }
  }
}

async function loadResolvedProfileCatalogs() {
  const token = ++catalogLoadToken;
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
    if (token !== catalogLoadToken) return;

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Error loading catalogs',
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
    if (token === catalogLoadToken) {
      catalogLoading.value = false;
    }
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
        summary: 'Refresh failed',
        detail:
          'Some suggestions may have been applied, but the page failed to refresh automatically.',
        life: 5000,
      });
    }

    if (createdCount > 0 && failedCount === 0) {
      toast.add({
        severity: 'success',
        summary: 'Suggestions applied',
        detail: `${createdCount} suggested component${createdCount === 1 ? '' : 's'} added across statements.`,
        life: 4000,
      });
    } else if (createdCount > 0 && failedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partially applied',
        detail: `${createdCount} suggestion${createdCount === 1 ? '' : 's'} added, ${failedCount} failed.`,
        life: 5000,
      });
    } else if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Bulk apply failed',
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
        summary: 'Some suggestions could not be loaded',
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
        summary: 'No pending suggestions',
        detail: 'All current statement suggestions are already applied.',
        life: 3000,
      });
      return;
    }

    bulkSuggestionsConfirmOpen.value = true;
    confirm.require({
      header: 'Apply all suggestions',
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
      summary: 'Unable to load suggestions',
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
      summary: 'Error loading catalogs',
      detail: await getErrorDetail(
        err,
        'An error occurred while loading profile catalogs.',
      ),
      life: 3000,
    });
  }
});

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

// Attaching or detaching a profile changes which controls the tree shows. Reloading the
// bindings is enough: the profileBindings watcher re-resolves their catalogs.
async function handleProfilesUpdated() {
  try {
    await loadProfileBindings({ keepCurrent: true });
  } catch (err) {
    error.value = err;
    toast.add({
      severity: 'error',
      summary: 'Error loading profile bindings',
      detail: await getErrorDetail(
        err,
        'An error occurred while loading the profiles linked to this SSP.',
      ),
      life: 3000,
    });
  }
}

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
      summary: 'Error loading profile bindings',
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

// Redesigned presentation ----------------------------------------------------------------------

// Controls and Profiles are tabs; the tab is in the address (?tab=profiles), like other in-page
// tabs.
const route = useRoute();
const onProfilesTab = dsComputed(() => route.query.tab === 'profiles');
const tabs = [
  { label: 'Controls', to: { query: {} } },
  { label: 'Profiles', to: { query: { tab: 'profiles' } } },
];

// Each control row's Implementation and Evidence boxes: the plan's components, and the evidence
// filters by the controls they check. One request each serves every row.
const { data: sspComponents, execute: fetchSspComponents } = useDataApi<
  SystemComponent[]
>(
  `/api/oscal/system-security-plans/${systemStore.system.securityPlan?.uuid}/system-implementation/components`,
);
const { data: sspFilters, execute: fetchSspFilters } = useDataApi<Dashboard[]>(
  '/api/filters',
  {
    // A camelCase API: it returns global filters and this plan's.
    params: { sspId: systemStore.system.securityPlan?.uuid },
  },
);
const componentsByUuid = dsComputed(
  () => new Map((sspComponents.value ?? []).map((c) => [c.uuid, c])),
);
const filtersByControl = dsComputed(() => {
  const map = new Map<string, Dashboard[]>();
  for (const filter of sspFilters.value ?? [])
    for (const control of filter.controls ?? []) {
      const key = normalizeId(control.id);
      map.set(key, [...(map.get(key) ?? []), filter]);
    }
  return map;
});
const refreshFilters = () => void fetchSspFilters().catch(() => undefined);

// Links to a control in its catalog. A profile's import points at a back-matter resource whose
// link names the catalog (`#<catalog UUID>`), or at the catalog itself.
const profileCatalogs = dsRef(new Map<string, string[]>());
interface BackMatter {
  resources?: { uuid: string; rlinks?: { href: string }[] }[];
}
async function loadProfileCatalogs(): Promise<void> {
  const entries = await Promise.all(
    profileBindings.value.map(async (profile) => {
      try {
        const [imports, backMatter] = await Promise.all([
          axios.get<DataResponse<{ href: string }[]>>(
            `/api/oscal/profiles/${profile.uuid}/imports`,
          ),
          axios.get<DataResponse<BackMatter>>(
            `/api/oscal/profiles/${profile.uuid}/back-matter`,
          ),
        ]);
        const resources = backMatter.data.data?.resources ?? [];
        const catalogs = (imports.data.data ?? []).map(({ href }) => {
          const ref = href.replace(/^#/, '');
          const link = resources
            .find((r) => r.uuid === ref)
            ?.rlinks?.find((l) => l.href.startsWith('#'));
          return link ? link.href.slice(1) : ref;
        });
        return [profile.uuid, [...new Set(catalogs)]] as [string, string[]];
      } catch {
        return [profile.uuid, []] as [string, string[]];
      }
    }),
  );
  profileCatalogs.value = new Map(entries);
}
watch(profileBindings, () => void loadProfileCatalogs(), { immediate: true });

/** Where each control is: the first profile that brings it in, and its groups there. */
const controlLocations = dsComputed(() => {
  const map = new Map<string, { profileId: string; groupIds: string[] }>();
  const walk = (list: TreeNode[], profileId: string, groupIds: string[]) => {
    for (const node of list) {
      if (node.type !== 'control') {
        walk(node.children ?? [], profileId, [...groupIds, node.data.id]);
        continue;
      }
      const key = normalizeId(node.data.id);
      if (!map.has(key)) map.set(key, { profileId, groupIds });
      walk(node.children ?? [], profileId, groupIds);
    }
  };
  for (const profile of nodes.value)
    walk(profile.children ?? [], profile.data.id, []);
  return map;
});
function catalogLink(controlId: string) {
  const location = controlLocations.value.get(normalizeId(controlId));
  const catalog =
    location && profileCatalogs.value.get(location.profileId)?.[0];
  if (!location || !catalog) return undefined;
  return {
    name: 'catalog-view',
    params: { id: catalog },
    query: { control: controlId, groups: location.groupIds.join(',') },
  };
}

const treeQuery = dsRef('');
const treeDraft = dsRef('');

// "Include controls from": the attached profiles whose controls are listed. The unticked ones are
// kept, so a newly attached profile is included.
const excludedProfiles = dsRef<string[]>([]);
const profileOptions = dsComputed(() =>
  profileBindings.value.map((p) => ({ value: p.uuid, label: p.title })),
);
const includedProfiles = dsComputed({
  get: () =>
    profileOptions.value
      .map((o) => o.value)
      .filter((id) => !excludedProfiles.value.includes(id)),
  set: (ids: string[]) =>
    (excludedProfiles.value = profileOptions.value
      .map((o) => o.value)
      .filter((id) => !ids.includes(id))),
});
const sections = dsComputed(() =>
  controlSections(
    nodes.value.filter((node) => includedProfiles.value.includes(node.data.id)),
    treeQuery.value,
  ),
);
const noSectionsText = dsComputed(() => {
  if (!includedProfiles.value.length)
    return 'Include the controls from at least one profile.';
  return treeQuery.value
    ? `No control matches "${treeQuery.value}".`
    : 'These profiles bring in no controls.';
});
const pageStatus = dsComputed(() => {
  if (loading.value) return 'loading' as const;
  if (!activeProfile.value || !profilesResolved.value) return 'empty' as const;
  return 'ready' as const;
});
// The control open in its view, from the address (?control=ac-2): Back closes it, and a link
// opens it.
const router = useRouter();
const viewedControl = dsComputed(() => {
  const q = route.query.control;
  return typeof q === 'string' ? controlsById.value[normalizeId(q)] : undefined;
});
const controlViewOpen = dsComputed({
  get: () => Boolean(viewedControl.value),
  set: (open: boolean) => {
    if (!open)
      void router.replace({ query: { ...route.query, control: undefined } });
  },
});

const drawerTitle = dsComputed(() =>
  selectedControl.value
    ? `${selectedControl.value.id} · ${selectedControl.value.title}`
    : 'Implementation',
);

provideControlTree({
  sspId: () => systemStore.system.securityPlan?.uuid ?? '',
  suggestionsEnabled: () => aiConfigStore.dashboardSuggestionsEnabled,
  implementation: (id) => controlImplementations.value[id],
  component: (uuid) => componentsByUuid.value.get(uuid),
  components: () => sspComponents.value ?? [],
  refreshComponents: () => void fetchSspComponents().catch(() => undefined),
  newComponentLink: () => ({
    name: 'system-configure-components',
    params: { systemId: route.params.systemId },
    query: { create: '1' },
  }),
  editDenied: () => statementEditDenied.value,
  reload: loadControlImplementations,
  catalogLink,
  filters: (id) => filtersByControl.value.get(normalizeId(id)) ?? [],
  byComponentCount: controlByComponentCount,
  riskCount: controlRiskCount,
  riskSeverity: controlHighestSeverity,
  suggestionCount: controlSuggestionCount,
  highlighted: isHighlightedControl,
  openDrawer: openControlDrawer,
  controlLink: (controlId) => ({
    query: { ...route.query, control: controlId },
  }),
  risksLink: (controlId) => ({ name: 'risks:index', query: { controlId } }),
  onExported: () => void handleExported(),
  onImported: (payload) =>
    void handleImported(payload as Parameters<typeof handleImported>[0]),
  onStatementsClosed: refreshFilters,
});
</script>

<template>
  <ListTemplate
    title="Implementation"
    :description="`How ${selectedSspTitle} implements its controls.`"
    :tabs="tabs"
  >
    <template v-if="activeProfile && !onProfilesTab" #actions>
      <Button
        :loading="bulkSuggestionsBusy"
        :disabled-reason="
          bulkSuggestionsOperationLocked || catalogLoading || loading
            ? 'Wait for the current operation to finish.'
            : undefined
        "
        @click="prepareApplyAllSuggestions"
        >{{ bulkSuggestionsButtonLabel }}</Button
      >
    </template>

    <template v-if="pageStatus === 'ready' && !onProfilesTab" #filters>
      <FilterBar
        v-model:query="treeDraft"
        label="Filter controls"
        search-label="ID and title filter"
        search-placeholder="ID or title, e.g. ac-2"
        :chips="treeQuery ? [{ label: `Search: ${treeQuery}` }] : []"
        @search="treeQuery = treeDraft.trim()"
        @remove="treeQuery = treeDraft = ''"
        @clear="treeQuery = treeDraft = ''"
      >
        <CheckboxGroup
          v-if="profileOptions.length > 1"
          v-model="includedProfiles"
          legend="Include controls from"
          :options="profileOptions"
        />
      </FilterBar>
    </template>

    <Panel
      v-if="onProfilesTab"
      title="Profiles"
      :level="2"
      description="The profiles this system implements decide its controls."
    >
      <ProfilesField :ssp-id="selectedSspId" @updated="handleProfilesUpdated" />
    </Panel>
    <DataState
      v-else
      :status="pageStatus"
      subject="controls"
      :empty-title="
        activeProfile
          ? 'No catalog for this profile'
          : 'No profile attached yet'
      "
      :empty-body="
        activeProfile
          ? 'The attached profile has no catalog to resolve controls from.'
          : 'Attach one or more profiles on the Profiles tab to choose which controls this system implements. Their controls appear here, ready to document.'
      "
      icon="controls"
      skeleton="panel"
    >
      <template v-if="!activeProfile" #empty-actions>
        <Button variant="primary" :to="{ query: { tab: 'profiles' } }"
          >Attach profiles</Button
        >
      </template>
      <Panel title="Controls" :level="2">
        <Text v-if="!sections.length" variant="secondary">{{
          noSectionsText
        }}</Text>
        <PanelSection
          v-for="section in sections"
          :key="section.key"
          :title="`${section.title} (${section.controls.length})`"
        >
          <Stack gap="3">
            <LinkedColumnsHeader :columns="LINK_COLUMNS" />
            <Stack gap="6" as="ul">
              <li v-for="control in section.controls" :key="control.id">
                <ControlLinkRow :control="control" />
              </li>
            </Stack>
          </Stack>
        </PanelSection>
      </Panel>
    </DataState>
  </ListTemplate>

  <ControlView
    v-if="viewedControl"
    v-model:open="controlViewOpen"
    :control="viewedControl"
  />

  <Drawer
    v-model:open="controlDrawerOpen"
    :title="drawerTitle"
    :description="selectedControlDescription"
  >
    <Stack gap="6">
      <ControlSuggestions
        v-if="aiConfigStore.dashboardSuggestionsEnabled"
        :ssp-id="systemStore.system.securityPlan?.uuid"
        :suggestions="selectedControlDashboardSuggestions"
        :result="selectedControlSuggestionResult"
        :loading="dashboardSuggestionStateLoading"
      />
      <Stack gap="4">
        <Text variant="label"
          >Components ({{ drawerByComponents.length }})</Text
        >
        <ByComponentStatement
          v-for="{ byComponent, statementId } in drawerByComponents"
          :key="byComponent.uuid"
          :by-component="byComponent"
          :control-id="selectedImplementedRequirement?.controlId"
          :ssp-id="systemStore.system.securityPlan?.uuid"
          :ssp-risks="sspRisks || []"
          :risk-fetch-limit="RISK_FETCH_LIMIT"
          :edit-denied-reason="statementEditDenied"
          @save="(next) => saveByComponent(next, statementId)"
          @delete="(next) => deleteByComponent(next, statementId)"
        />
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
      </Stack>
    </Stack>
  </Drawer>
</template>
