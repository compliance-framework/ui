<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import type {
  ByComponent,
  ImplementedRequirement,
  Statement,
  SystemComponent,
} from '@/oscal';
import { computed, nextTick, onMounted, ref, toValue, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Dashboard } from '@/stores/filters.ts';
import FormInput from '@/components/forms/FormInput.vue';
import type { Evidence, EvidenceLabel } from '@/stores/evidence.ts';
import { useSystemStore } from '@/stores/system.ts';
import Select from '@/volt/Select.vue';
import Textarea from '@/volt/Textarea.vue';
import { useCloned } from '@vueuse/core';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import StatementCreateForm from '@/components/system-security-plans/StatementCreateForm.vue';
import StatementEditForm from '@/components/system-security-plans/StatementEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import DashboardEvidenceCounter from '@/views/control-implementations/partials/DashboardEvidenceCounter.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import {
  buildByComponentsEndpoint,
  buildSuggestComponentsEndpoint,
  getExistingComponentUuidSet,
  getUnappliedSuggestions,
  normalizeSuggestedComponentsResponse,
  type SuggestedComponent,
  type SystemComponentSuggestion,
} from '@/views/control-implementations/partials/component-suggestions';

const { system } = useSystemStore();
const toast = useToast();
const router = useRouter();

const showError = ref(false);

const showCreateStatementModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateComponentModal = ref(false);

const { value: showEvidenceLinkingForm, set: setEvidenceLinkingForm } =
  useToggle(false);
const evidenceDashboard = ref<{ name: string; filter: string }>({
  name: '',
  filter: '',
});

// Evidence selection state with searchText for filtering
interface SearchableEvidence extends Evidence {
  searchText: string;
}
const availableEvidence = ref<SearchableEvidence[]>([]);
const selectedBaselineEvidence = ref<SearchableEvidence | null>(null);
const evidenceLoading = ref(false);

// Label query builder state
interface LabelCondition {
  name: string;
  value: string;
}
const labelConditions = ref<LabelCondition[]>([]);
const newLabelName = ref('');
const newLabelValue = ref('');

// Existing dashboards for this control
type DashboardWithControls = Dashboard;
const existingDashboards = ref<DashboardWithControls[]>([]);
const allDashboards = ref<DashboardWithControls[]>([]);
const dashboardsLoading = ref(false);

// Link existing dashboard state
const { value: showLinkExistingForm, set: setLinkExistingForm } =
  useToggle(false);
const selectedDashboardToLink = ref<DashboardWithControls | null>(null);

const { value: showCreateComponentForm, set: setCreateComponentForm } =
  useToggle(false);

const route = useRoute();

const {
  statement,
  implementation,
  sspId: providedSspId,
  partid,
} = defineProps<{
  statement?: Statement;
  implementation: ImplementedRequirement;
  sspId?: string;
  partid?: string;
}>();

const localStatement = ref<Statement | undefined>(statement);

const resolvedSspId = computed(() => {
  if (providedSspId) return providedSspId;
  const routeId = route.params.id;
  if (typeof routeId === 'string' && routeId.length) return routeId;
  if (Array.isArray(routeId) && routeId.length) return routeId[0];
  return system.securityPlan?.uuid;
});

const emit = defineEmits<{
  updated: [statement: Statement];
}>();

const {
  data: components,
  isLoading: componentsLoading,
  execute: fetchComponents,
} = useDataApi<SystemComponent[]>(null, null, { immediate: false });
const { execute: executeUpdate } = useDataApi<Statement>(null, {
  transformRequest: [decamelizeKeys],
  method: 'PUT',
});

const { execute: executeDelete } = useDataApi<Statement>(null, {
  transformRequest: [decamelizeKeys],
  method: 'DELETE',
});

const { data: createdByComponentResponse, execute: executeCreate } =
  useDataApi<ByComponent>(null, {
    transformRequest: [decamelizeKeys],
    method: 'POST',
  });
const {
  data: suggestedComponentsResponse,
  execute: fetchSuggestedComponentsApi,
} = useDataApi<SystemComponentSuggestion[]>(
  null,
  {
    method: 'POST',
  },
  { immediate: false },
);

const suggestedComponents = ref<SuggestedComponent[]>([]);
const suggestionsLoading = ref(false);
const suggestionsError = ref('');
const applyingSuggestedComponentUuids = ref<string[]>([]);
const applyingAllSuggestions = ref(false);
let latestSuggestionsRequestId = 0;

const { execute: createEvidenceDashboard } = useDataApi<Dashboard>(
  '/api/filters',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const { execute: fetchEvidenceForLabels } = useDataApi<Evidence[]>(
  '/api/evidence/search',
  {
    method: 'POST',
  },
  { immediate: false },
);

const { execute: fetchDashboardsByControl } = useDataApi<
  DashboardWithControls[]
>(
  '/api/filters',
  {
    params: {
      controlId: implementation.controlId,
    },
  },
  { immediate: false },
);

const { execute: fetchAllDashboards } = useDataApi<DashboardWithControls[]>(
  '/api/filters',
  {},
  { immediate: false },
);

const { execute: updateDashboard } = useDataApi<Dashboard>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

watch(
  resolvedSspId,
  async (id) => {
    if (!id) return;
    await fetchComponents(
      `/api/oscal/system-security-plans/${id}/system-implementation/components`,
    );
  },
  { immediate: true },
);

const componentItems = computed(() => {
  return toValue(components.value || []).map((item) => {
    return {
      name: item.title,
      value: item.uuid,
    };
  });
});
const componentMetadataByUuid = computed(() => {
  return new Map(
    (components.value ?? []).map((component) => [
      component.uuid,
      { title: component.title, type: component.type },
    ]),
  );
});
const displayedSuggestions = computed(() => {
  return suggestedComponents.value.map((suggestion) => {
    const fallback = componentMetadataByUuid.value.get(
      suggestion.componentUuid,
    );
    return {
      ...suggestion,
      title: suggestion.title || fallback?.title || suggestion.componentUuid,
      type: suggestion.type || fallback?.type || 'unknown',
    };
  });
});
const existingComponentUuidSet = computed(() =>
  getExistingComponentUuidSet(localStatement.value?.byComponents),
);
const unappliedSuggestions = computed(() =>
  getUnappliedSuggestions(
    localStatement.value?.byComponents,
    displayedSuggestions.value,
  ),
);
const allSuggestionsApplied = computed(
  () =>
    displayedSuggestions.value.length > 0 &&
    unappliedSuggestions.value.length === 0,
);

watch(
  () => statement,
  (value) => {
    localStatement.value = value;
  },
  { immediate: true },
);

const newByComponent = ref<ByComponent>({
  uuid: uuidv4(),
  implementationStatus: {
    state: '',
  },
} as ByComponent);
const selectedComponent = ref();
watch(selectedComponent, () => {
  // When the selected component changes, update the model
  newByComponent.value.componentUuid = selectedComponent.value?.value;
});

onMounted(() => {
  if (!system.securityPlan?.uuid) {
    return;
  }
  // Load existing dashboards for this control
  loadDashboardsForControl();
});

watch(
  () => [
    resolvedSspId.value,
    implementation.uuid,
    implementation.controlId,
    localStatement.value?.uuid,
    localStatement.value?.statementId,
    partid,
  ],
  async ([sspId]) => {
    if (!sspId) {
      latestSuggestionsRequestId += 1;
      suggestedComponents.value = [];
      suggestionsError.value = '';
      suggestionsLoading.value = false;
      return;
    }
    await fetchSuggestedComponents();
  },
  { immediate: true },
);

function isSuggestionApplied(componentUuid: string): boolean {
  return existingComponentUuidSet.value.has(componentUuid);
}

function isSuggestionApplying(componentUuid: string): boolean {
  return applyingSuggestedComponentUuids.value.includes(componentUuid);
}

function formatRelevanceScore(score: number | undefined): string {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return '';
  }
  return score.toFixed(2);
}

function setSuggestionApplying(componentUuid: string, applying: boolean) {
  if (applying) {
    if (!applyingSuggestedComponentUuids.value.includes(componentUuid)) {
      applyingSuggestedComponentUuids.value = [
        ...applyingSuggestedComponentUuids.value,
        componentUuid,
      ];
    }
    return;
  }
  applyingSuggestedComponentUuids.value =
    applyingSuggestedComponentUuids.value.filter(
      (uuid) => uuid !== componentUuid,
    );
}

async function fetchSuggestedComponents() {
  const requestId = ++latestSuggestionsRequestId;
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  if (!sspId) {
    if (requestId === latestSuggestionsRequestId) {
      suggestedComponents.value = [];
      suggestionsError.value = '';
      suggestionsLoading.value = false;
    }
    return;
  }
  if (!statementUuid) {
    if (requestId === latestSuggestionsRequestId) {
      suggestedComponents.value = [];
      suggestionsError.value = '';
      suggestionsLoading.value = false;
    }
    return;
  }

  if (requestId === latestSuggestionsRequestId) {
    suggestionsLoading.value = true;
    suggestionsError.value = '';
  }

  try {
    await fetchSuggestedComponentsApi(
      buildSuggestComponentsEndpoint(sspId, implementation.uuid, statementUuid),
    );

    if (requestId !== latestSuggestionsRequestId) {
      return;
    }

    suggestedComponents.value = normalizeSuggestedComponentsResponse(
      suggestedComponentsResponse.value,
    );
  } catch (error) {
    if (requestId !== latestSuggestionsRequestId) {
      return;
    }
    suggestedComponents.value = [];
    suggestionsError.value =
      error instanceof Error
        ? error.message
        : 'Unable to load component suggestions.';
  } finally {
    if (requestId === latestSuggestionsRequestId) {
      suggestionsLoading.value = false;
    }
  }
}

async function createStatementByComponent(
  componentUuid: string,
  description = '',
): Promise<ByComponent | undefined> {
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  if (!sspId || !statementUuid) {
    const missing =
      !sspId && !statementUuid
        ? 'system security plan and statement'
        : !sspId
          ? 'system security plan'
          : 'statement';
    console.error(
      `Unable to create component implementation: missing ${missing}.`,
    );
    toast.add({
      severity: 'error',
      summary: 'Unable to Add Component Implementation',
      detail:
        'A system security plan and control statement must be selected before adding a component implementation.',
      life: 5000,
    });
    return undefined;
  }

  const response = await executeCreate(
    buildByComponentsEndpoint(sspId, implementation.uuid, statementUuid),
    {
      data: {
        uuid: uuidv4(),
        componentUuid,
        description,
        implementationStatus: {
          state: '',
        },
      } as ByComponent,
    },
  );

  const apiCreated = response.response.value?.data?.data;
  const created = apiCreated ?? createdByComponentResponse.value;
  if (!created?.uuid) {
    console.error(
      'Unexpected by-component create response payload:',
      apiCreated,
    );
    toast.add({
      severity: 'error',
      summary: 'Error Creating By-Component',
      detail: 'The server did not return a valid component implementation.',
      life: 4000,
    });
    return undefined;
  }

  return created;
}

function resetCreateComponentForm() {
  setCreateComponentForm(false);
  showError.value = false;
  selectedComponent.value = null;

  newByComponent.value = {
    uuid: uuidv4(),
    implementationStatus: {
      state: '',
    },
  } as ByComponent;
}

async function deleteByComponent(byComp: ByComponent) {
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail: 'Unable to determine which system security plan to update.',
      life: 4000,
    });
    return;
  }
  if (!statementUuid) {
    return;
  }
  const updatedStatement = useCloned(localStatement).cloned;

  if (!updatedStatement.value) {
    console.error('No statement defined');
    return;
  }

  updatedStatement.value.byComponents =
    updatedStatement.value.byComponents?.filter(
      (comp: ByComponent) => byComp.uuid !== comp.uuid,
    );
  try {
    await executeDelete(
      `${buildByComponentsEndpoint(sspId, implementation.uuid, statementUuid)}/${byComp.uuid}`,
    );
    localStatement.value = updatedStatement.value;
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function updateByComponent(byComp: ByComponent) {
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail: 'Unable to determine which system security plan to update.',
      life: 4000,
    });
    return;
  }
  if (!localStatement.value || !statementUuid) {
    console.error('No statement or statement UUID defined');
    return;
  }
  try {
    await executeUpdate(
      `${buildByComponentsEndpoint(sspId, implementation.uuid, statementUuid)}/${byComp.uuid}`,
      {
        data: byComp,
      },
    );
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function createByComponent() {
  if (!newByComponent.value.componentUuid || !localStatement.value?.uuid) {
    showError.value = true;
    return;
  }
  if (isSuggestionApplied(newByComponent.value.componentUuid)) {
    showError.value = false;
    toast.add({
      severity: 'warn',
      summary: 'Component Already Linked',
      detail:
        'This component is already linked to the statement and cannot be reused.',
      life: 4000,
    });
    return;
  }
  try {
    const created = await createStatementByComponent(
      newByComponent.value.componentUuid,
      newByComponent.value.description ?? '',
    );
    if (!created) {
      console.error('Failed to create: response data is missing');
      return;
    }
    if (!localStatement.value.byComponents) {
      localStatement.value.byComponents = [];
    }
    localStatement.value.byComponents.push(created);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Creating By-Component',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating a by-component.',
      life: 3000,
    });
  }
}

async function applySuggestedComponent(suggestion: SuggestedComponent) {
  if (!localStatement.value?.uuid) {
    toast.add({
      severity: 'info',
      summary: 'Create Statement First',
      detail: 'Create the statement before applying component suggestions.',
      life: 3000,
    });
    return;
  }
  if (isSuggestionApplied(suggestion.componentUuid)) {
    return;
  }

  setSuggestionApplying(suggestion.componentUuid, true);
  try {
    const created = await createStatementByComponent(suggestion.componentUuid);
    if (!created) {
      return;
    }
    if (!localStatement.value.byComponents) {
      localStatement.value.byComponents = [];
    }
    localStatement.value.byComponents.push(created);
    emit('updated', localStatement.value);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Applying Suggestion',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error applying suggested component.',
      life: 3000,
    });
  } finally {
    setSuggestionApplying(suggestion.componentUuid, false);
  }
}

async function applyAllSuggestedComponents() {
  if (!localStatement.value?.uuid) {
    toast.add({
      severity: 'info',
      summary: 'Create Statement First',
      detail: 'Create the statement before applying component suggestions.',
      life: 3000,
    });
    return;
  }

  const suggestionsToApply = [...unappliedSuggestions.value];
  if (!suggestionsToApply.length) {
    toast.add({
      severity: 'info',
      summary: 'All Suggestions Applied',
      detail: 'There are no pending component suggestions for this statement.',
      life: 3000,
    });
    return;
  }

  applyingAllSuggestions.value = true;
  let appliedCount = 0;
  try {
    for (const suggestion of suggestionsToApply) {
      if (isSuggestionApplied(suggestion.componentUuid)) {
        continue;
      }
      const created = await createStatementByComponent(
        suggestion.componentUuid,
      );
      if (!created) {
        continue;
      }
      if (!localStatement.value.byComponents) {
        localStatement.value.byComponents = [];
      }
      localStatement.value.byComponents.push(created);
      appliedCount += 1;
    }
    if (appliedCount > 0) {
      emit('updated', localStatement.value);
      toast.add({
        severity: 'success',
        summary: 'Suggestions Applied',
        detail: `${appliedCount} suggested component${appliedCount === 1 ? '' : 's'} added.`,
        life: 3000,
      });
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Applying Suggestions',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error applying component suggestions.',
      life: 3000,
    });
  } finally {
    applyingAllSuggestions.value = false;
  }
}

function updateStatement(updatedStatement: Statement) {
  localStatement.value = updatedStatement;
  showCreateStatementModal.value = false;
  showEditStatementModal.value = false;
  emit('updated', localStatement.value);
  void fetchSuggestedComponents();
}

function handleComponentCreated(newComponent: SystemComponent) {
  if (components.value) {
    components.value.push(newComponent);
  }
  showCreateComponentModal.value = false;
  nextTick(() => {
    const found = componentItems.value.find(
      (item) => item.value === newComponent.uuid,
    );
    if (found) {
      selectedComponent.value = found;
    }
    setCreateComponentForm(true);
  });
}

function resetEvidenceLinkingForm() {
  setEvidenceLinkingForm(false);
  evidenceDashboard.value = { name: '', filter: '' };
  selectedBaselineEvidence.value = null;
  labelConditions.value = [];
  newLabelName.value = '';
  newLabelValue.value = '';
}

async function loadAvailableEvidence(forceReload = false) {
  if (!forceReload && availableEvidence.value.length > 0) return; // Already loaded
  evidenceLoading.value = true;
  try {
    const res = await fetchEvidenceForLabels({
      data: { filter: {} },
    });
    const evidenceList = res.data.value?.data || res.data.value || [];
    availableEvidence.value = (evidenceList as Evidence[])
      .filter((ev) => ev.labels && ev.labels.length > 0)
      .map((ev) => ({
        ...ev,
        searchText: [
          ev.title,
          ...(ev.labels?.map((l) => `${l.name} ${l.value}`) || []),
        ].join(' '),
      }));
  } catch (error) {
    console.error('Failed to load evidence:', error);
    toast.add({
      severity: 'error',
      summary: 'Failed to load evidence',
      detail: 'Evidence could not be loaded. Please try again later.',
      life: 3000,
    });
  } finally {
    evidenceLoading.value = false;
  }
}

/**
 * Fetches dashboards linked to the current control.
 */
async function loadDashboardsForControl() {
  dashboardsLoading.value = true;
  try {
    const res = await fetchDashboardsByControl();
    const dashboardList = res.data.value?.data || res.data.value || [];
    existingDashboards.value = dashboardList as DashboardWithControls[];
  } catch (error) {
    console.error('Failed to load dashboards:', error);
  } finally {
    dashboardsLoading.value = false;
  }
}

async function loadAllDashboards() {
  try {
    const res = await fetchAllDashboards();
    const dashboardList = res.data.value?.data || res.data.value || [];
    allDashboards.value = dashboardList as DashboardWithControls[];
  } catch (error) {
    console.error('Failed to load all dashboards:', error);
    toast.add({
      severity: 'error',
      summary: 'Error Loading Dashboards',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to load dashboards. Please try again later.',
      life: 3000,
    });
  }
}

// Dashboards available for linking (not already linked to this control or any components)
const availableDashboardsToLink = computed(() => {
  const controlId = implementation.controlId;
  return allDashboards.value.filter(
    (dashboard) =>
      !dashboard.controls?.some((control) => control.id === controlId) &&
      !dashboard.components?.length,
  );
});

async function linkExistingDashboard() {
  if (!selectedDashboardToLink.value) return;

  const dashboard = selectedDashboardToLink.value;
  const controlId = implementation.controlId;

  // Add current control to the dashboard's controls
  const existingControlIds = dashboard.controls?.map((c) => c.id) || [];
  const newControlIds = [...existingControlIds, controlId];

  try {
    await updateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        controls: newControlIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Dashboard Linked',
      detail: `Dashboard "${dashboard.name}" linked to this control.`,
      life: 3000,
    });
    // Refresh and reset
    await loadDashboardsForControl();
    await loadAllDashboards();
    selectedDashboardToLink.value = null;
    setLinkExistingForm(false);
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Linking Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error linking dashboard.',
      life: 3000,
    });
  }
}

async function unlinkDashboard(dashboard: DashboardWithControls) {
  const controlId = implementation.controlId;

  // Remove current control from the dashboard's controls
  const newControlIds =
    dashboard.controls?.filter((c) => c.id !== controlId).map((c) => c.id) ||
    [];

  try {
    await updateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        controls: newControlIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Dashboard Unlinked',
      detail: `Dashboard "${dashboard.name}" removed from this control.`,
      life: 3000,
    });
    await loadDashboardsForControl();
    await loadAllDashboards();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Unlinking Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error unlinking dashboard.',
      life: 3000,
    });
  }
}

// Convert a Filter object back to a string for URL query params
function filterToString(
  filter: import('@/parsers/labelfilter.ts').Filter | undefined,
): string {
  function scopeToString(
    scope: import('@/parsers/labelfilter.ts').Scope | undefined,
    path = 'scope',
  ): string {
    if (!scope) {
      throw new Error(`Invalid filter: missing ${path}.`);
    }

    if (scope.condition) {
      const { label, operator, value } = scope.condition;
      if (
        !label ||
        !operator ||
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.length === 0)
      ) {
        throw new Error(`Malformed condition at ${path}.`);
      }
      return `${label}${operator}${value}`;
    }

    if (scope.query) {
      const operator =
        scope.query.operator && scope.query.operator.trim().length > 0
          ? scope.query.operator
          : 'and';
      const scopes = scope.query.scopes?.filter(Boolean) ?? [];
      if (!scopes.length) {
        throw new Error(`Query at ${path} has no scopes.`);
      }
      const parts = scopes.map((childScope, index) =>
        scopeToString(childScope, `${path}.query.scopes[${index}]`),
      );
      const joined = parts.join(` ${operator} `);
      return parts.length > 1 ? `(${joined})` : joined;
    }

    throw new Error(`Scope at ${path} is missing both condition and query.`);
  }

  if (!filter || !filter.scope) {
    throw new Error('Filter is missing a valid scope.');
  }

  return scopeToString(filter.scope);
}

function viewDashboardEvidence(dashboard: DashboardWithControls) {
  try {
    const filterString = filterToString(dashboard.filter);
    router.push({ name: 'evidence:index', query: { filter: filterString } });
  } catch (error) {
    console.error('Unable to build dashboard filter string.', error);
    toast.add({
      severity: 'error',
      summary: 'Invalid Dashboard Filter',
      detail:
        error instanceof Error
          ? error.message
          : 'Unable to open evidence because the filter is invalid.',
      life: 4000,
    });
  }
}

// Get unique titles for the dropdown (only show each title once)
const uniqueEvidenceTitles = computed(() => {
  const titleMap = new Map<string, SearchableEvidence>();
  for (const ev of availableEvidence.value) {
    if (!titleMap.has(ev.title)) {
      titleMap.set(ev.title, ev);
    }
  }
  return Array.from(titleMap.values());
});

// Get all evidence entries that match the selected title
const evidenceEntriesForSelectedTitle = computed(() => {
  if (!selectedBaselineEvidence.value) return [];
  return availableEvidence.value.filter(
    (ev) => ev.title === selectedBaselineEvidence.value!.title,
  );
});

// Available label names from ALL evidence entries with the selected title
const availableLabelNames = computed(() => {
  if (evidenceEntriesForSelectedTitle.value.length === 0) return [];
  const names = new Set<string>();
  for (const ev of evidenceEntriesForSelectedTitle.value) {
    if (ev.labels) {
      for (const label of ev.labels) {
        names.add(label.name);
      }
    }
  }
  return Array.from(names).sort();
});

// Available values for the selected label name (from evidence entries with the selected title that match current conditions)
const availableLabelValues = computed(() => {
  if (!newLabelName.value) return [];
  const values = new Set<string>();
  // Filter evidence entries with the selected title that match current conditions
  const relevantEvidence = evidenceEntriesForSelectedTitle.value.filter(
    (ev) => {
      if (!ev.labels) return false;
      // Must match all current label conditions
      return labelConditions.value.every((condition) =>
        ev.labels?.some(
          (l) => l.name === condition.name && l.value === condition.value,
        ),
      );
    },
  );
  for (const ev of relevantEvidence) {
    if (ev.labels) {
      for (const label of ev.labels) {
        if (label.name === newLabelName.value) {
          values.add(label.value);
        }
      }
    }
  }
  return Array.from(values).sort();
});

// Build filter string from label conditions
const computedFilter = computed(() => {
  if (labelConditions.value.length === 0) return '';
  return labelConditions.value.map((c) => `${c.name}=${c.value}`).join(' and ');
});

// When baseline evidence is selected, auto-populate _policy label
watch(selectedBaselineEvidence, (ev) => {
  if (!ev) {
    labelConditions.value = [];
    return;
  }
  // Find _policy label and auto-add it
  const policyLabel = ev.labels?.find((l) => l.name === '_policy');
  if (policyLabel) {
    labelConditions.value = [{ name: '_policy', value: policyLabel.value }];
  } else {
    labelConditions.value = [];
  }
  // Reset new label inputs
  newLabelName.value = '';
  newLabelValue.value = '';
});

// Sync computed filter to evidenceDashboard
watch(computedFilter, (filter) => {
  evidenceDashboard.value.filter = filter;
});

function addLabelCondition() {
  if (!newLabelName.value || !newLabelValue.value) return;
  // Avoid duplicates
  const exists = labelConditions.value.some(
    (c) => c.name === newLabelName.value && c.value === newLabelValue.value,
  );
  if (!exists) {
    labelConditions.value.push({
      name: newLabelName.value,
      value: newLabelValue.value,
    });
  }
  newLabelName.value = '';
  newLabelValue.value = '';
}

function removeLabelCondition(index: number) {
  labelConditions.value.splice(index, 1);
}

watch(showEvidenceLinkingForm, async (show) => {
  if (show) {
    await Promise.all([
      loadAvailableEvidence(true),
      loadDashboardsForControl(),
      loadAllDashboards(),
    ]);
  }
});

watch(showLinkExistingForm, async (show) => {
  if (show) {
    await Promise.all([loadDashboardsForControl(), loadAllDashboards()]);
  }
});

async function submitEvidenceLinking() {
  if (!evidenceDashboard.value.name || !localStatement.value) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please provide a name for the evidence dashboard.',
      life: 3000,
    });
    return;
  }
  if (!evidenceDashboard.value.filter?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please build a label filter before creating the dashboard.',
      life: 3000,
    });
    return;
  }
  const controlIds = [implementation.controlId];
  let parsedFilter;
  try {
    parsedFilter = new FilterParser(
      evidenceDashboard.value.filter.trim(),
    ).parse();
  } catch (parseError) {
    console.error(
      'Failed to parse label filter for evidence dashboard:',
      parseError,
    );
    toast.add({
      severity: 'error',
      summary: 'Invalid Label Filter',
      detail:
        'The label filter you entered is invalid. Please check its syntax and try again.',
      life: 3000,
    });
    return;
  }
  try {
    await createEvidenceDashboard({
      data: {
        name: evidenceDashboard.value.name,
        filter: parsedFilter,
        controls: controlIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Evidence Linked',
      detail: 'Evidence dashboard created successfully.',
      life: 3000,
    });
    // Refresh dashboards list and reset form for next entry
    await loadDashboardsForControl();
    resetEvidenceLinkingForm();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Creating Evidence Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating evidence dashboard.',
      life: 3000,
    });
  }
}
</script>

<template>
  <div class="pb-24">
    <div v-if="localStatement">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <TooltipTitle
            text="Statement ID"
            tooltip-key="statement.id"
            underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
          />
          <p class="text-sm">{{ localStatement?.statementId }}</p>
        </div>
        <div>
          <TooltipTitle
            text="Remarks"
            tooltip-key="statement.remarks"
            underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
          />
          <p class="text-sm">{{ localStatement?.remarks || 'None' }}</p>
        </div>
        <div>
          <TooltipTitle
            text="Description"
            tooltip-key="statement.description"
            underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
          />
          <p class="text-sm">{{ localStatement?.description || 'None' }}</p>
        </div>
        <div>
          <TooltipTitle
            text="Props"
            tooltip-key="statement.props"
            underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
          />
          <p class="text-sm">{{ localStatement?.props || 'None' }}</p>
        </div>
        <div>
          <TooltipTitle
            text="Links"
            tooltip-key="statement.links"
            underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
          />
          <p class="text-sm">{{ localStatement?.links || 'None' }}</p>
        </div>
      </div>

      <div class="flex items-center mb-4 gap-x-4">
        <Button
          label="Edit Statement"
          @click="showEditStatementModal = true"
          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </Button>
      </div>

      <div class="mb-6">
        <div class="flex items-center justify-between gap-4 mb-3">
          <h4 class="m-0 font-medium text-base">Suggested Components</h4>
          <Button
            type="button"
            severity="secondary"
            :disabled="
              !localStatement ||
              applyingAllSuggestions ||
              suggestionsLoading ||
              unappliedSuggestions.length === 0
            "
            :label="
              applyingAllSuggestions ? 'Applying...' : 'Apply All Suggestions'
            "
            @click="applyAllSuggestedComponents"
          />
        </div>

        <p v-if="suggestionsLoading" class="text-sm text-gray-500">
          Loading suggested components...
        </p>
        <p v-else-if="suggestionsError" class="text-sm text-red-500">
          Failed to load suggestions. You can still add components manually.
        </p>
        <p
          v-else-if="displayedSuggestions.length === 0"
          class="text-sm text-gray-500"
        >
          No suggestions available for this statement.
        </p>
        <div v-else class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="suggestion in displayedSuggestions"
              :key="suggestion.componentUuid"
              type="button"
              size="small"
              class="!text-left"
              severity="secondary"
              :outlined="!isSuggestionApplied(suggestion.componentUuid)"
              :disabled="
                !localStatement ||
                isSuggestionApplied(suggestion.componentUuid) ||
                isSuggestionApplying(suggestion.componentUuid) ||
                applyingAllSuggestions
              "
              @click="applySuggestedComponent(suggestion)"
            >
              <div class="flex flex-col items-start gap-1">
                <span class="text-xs font-semibold">{{
                  suggestion.title
                }}</span>
                <span class="text-xs text-gray-500">{{ suggestion.type }}</span>
                <span
                  v-if="formatRelevanceScore(suggestion.relevanceScore)"
                  class="text-xs text-gray-500"
                >
                  Relevance:
                  {{ formatRelevanceScore(suggestion.relevanceScore) }}
                </span>
                <span
                  v-if="isSuggestionApplied(suggestion.componentUuid)"
                  class="text-xs text-green-600"
                >
                  Added
                </span>
              </div>
            </Button>
          </div>

          <p v-if="allSuggestionsApplied" class="text-sm text-green-600">
            All suggestions applied.
          </p>
        </div>
      </div>

      <div class="flex items-center mb-4 gap-x-4">
        <TooltipTitle
          text="Components"
          tooltip-key="control.implementation.components"
          position="bottom"
          underline-class="font-medium text-xl underline decoration-dotted cursor-help"
        />
        <BurgerMenu
          :items="[
            {
              label: 'Add Component',
              command: () => {
                setCreateComponentForm(true);
              },
            },
            {
              label: 'Create New Component',
              command: () => {
                showCreateComponentModal = true;
              },
            },
          ]"
        />
      </div>
      <template v-if="localStatement">
        <div
          v-for="(byComponent, index) in localStatement.byComponents || []"
          :key="byComponent.uuid"
        >
          <div
            class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-4"
            v-if="index !== 0"
          ></div>
          <StatementByComponent
            @save="updateByComponent"
            @delete="deleteByComponent"
            :by-component="byComponent"
            :control-id="implementation.controlId"
          />
        </div>
      </template>

      <form @submit.prevent="createByComponent" v-if="showCreateComponentForm">
        <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
        <div class="flex justify-between items-center mb-4">
          <h4 class="m-0">New Component Implementation</h4>
          <Button
            label="Create New"
            class="!text-xs !py-1 !px-2 !text-blue-600 hover:!text-blue-800 dark:!text-blue-400"
            severity="secondary"
            text
            @click="showCreateComponentModal = true"
          />
        </div>
        <div class="mb-2">
          <Select
            placeholder="Select a component"
            :loading="componentsLoading"
            checkmark
            class="w-full"
            v-model="selectedComponent"
            :options="componentItems"
            optionLabel="name"
            v-on:update:model-value="showError = false"
          />
          <small v-if="showError" class="p-error" style="color: red">
            Please select a valid component.
          </small>
        </div>

        <div class="mb-2">
          <Textarea
            v-model="newByComponent.description"
            rows="5"
            cols="30"
            class="resize-none w-full"
            placeholder="Description"
            @keyup.ctrl.enter="createByComponent"
          />
        </div>
        <div class="text-right">
          <secondary-button @click="resetCreateComponentForm"
            >Cancel</secondary-button
          >
          <primary-button
            type="submit"
            v-tooltip.bottom="'ctrl + enter to create'"
            >Create</primary-button
          >
        </div>
      </form>

      <!-- Evidence Linking Section -->
      <div class="mt-8">
        <div class="flex items-center mb-4 gap-x-4">
          <TooltipTitle
            text="Evidence Linking"
            tooltip-key="control.implementation.evidence"
            position="bottom"
            underline-class="font-medium text-xl underline decoration-dotted cursor-help"
          />
          <BurgerMenu
            :items="[
              {
                label: 'Create New Dashboard',
                command: () => {
                  setLinkExistingForm(false);
                  setEvidenceLinkingForm(true);
                },
              },
              {
                label: 'Link Existing Dashboard',
                command: () => {
                  setEvidenceLinkingForm(false);
                  setLinkExistingForm(true);
                },
              },
            ]"
          />
        </div>

        <!-- Existing Dashboards List -->
        <div v-if="existingDashboards.length > 0" class="mb-6">
          <h6 class="text-sm font-medium text-gray-500 mb-2">
            Linked Dashboards
          </h6>
          <div class="space-y-2">
            <div
              v-for="dashboard in existingDashboards"
              :key="dashboard.id"
              class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md flex items-center justify-between gap-4"
            >
              <span class="font-medium">{{ dashboard.name }}</span>
              <div class="flex items-center gap-3">
                <DashboardEvidenceCounter :dashboard-id="dashboard.id!" />
                <Button
                  type="button"
                  severity="secondary"
                  text
                  size="small"
                  @click="viewDashboardEvidence(dashboard)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  View Evidence
                </Button>
                <Button
                  type="button"
                  severity="danger"
                  text
                  size="small"
                  @click="unlinkDashboard(dashboard)"
                  class="text-red-500 hover:text-red-700"
                >
                  Unlink
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="dashboardsLoading" class="mb-6 text-sm text-gray-500">
          Loading dashboards...
        </div>
        <div
          v-else-if="
            showEvidenceLinkingForm === false && showLinkExistingForm === false
          "
          class="mb-6 text-sm text-gray-500"
        >
          No dashboards linked to this control yet.
        </div>

        <!-- Link Existing Dashboard Form -->
        <form
          @submit.prevent="linkExistingDashboard"
          v-if="showLinkExistingForm"
        >
          <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
          <div class="flex justify-between items-center mb-4">
            <h4 class="m-0">Link Existing Dashboard</h4>
          </div>
          <div class="mb-4">
            <label class="inline-block pb-2 text-sm font-medium"
              >Select Dashboard</label
            >
            <Select
              v-model="selectedDashboardToLink"
              :options="availableDashboardsToLink"
              optionLabel="name"
              filter
              placeholder="Select a dashboard to link..."
              class="w-full"
            />
          </div>
          <div class="text-right">
            <secondary-button
              @click="
                setLinkExistingForm(false);
                selectedDashboardToLink = null;
              "
              >Cancel</secondary-button
            >
            <primary-button type="submit" :disabled="!selectedDashboardToLink"
              >Link Dashboard</primary-button
            >
          </div>
        </form>

        <!-- New Dashboard Form -->
        <form
          @submit.prevent="submitEvidenceLinking"
          v-if="showEvidenceLinkingForm"
        >
          <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
          <div class="flex justify-between items-center mb-4">
            <h4 class="m-0">New Evidence Dashboard</h4>
          </div>
          <div class="mb-4">
            <label class="inline-block pb-2 text-sm font-medium">Name</label>
            <FormInput
              v-model="evidenceDashboard.name"
              placeholder="Dashboard name"
            />
          </div>

          <!-- Baseline Evidence Selection (single select) -->
          <div class="mb-4">
            <label class="inline-block pb-2 text-sm font-medium"
              >Select Baseline Evidence</label
            >
            <div class="flex flex-col gap-2">
              <Select
                v-model="selectedBaselineEvidence"
                :options="uniqueEvidenceTitles"
                optionLabel="title"
                filter
                :filterFields="['title', 'searchText']"
                placeholder="Select an evidence as baseline..."
                :loading="evidenceLoading"
                class="w-full"
              >
                <template #option="slotProps">
                  <div class="flex flex-col">
                    <span class="font-medium">{{
                      slotProps.option.title
                    }}</span>
                    <span class="text-xs text-gray-500 dark:text-slate-400">
                      {{
                        slotProps.option.labels
                          ?.map((l: EvidenceLabel) => `${l.name}=${l.value}`)
                          .join(', ')
                      }}
                    </span>
                  </div>
                </template>
              </Select>
            </div>
          </div>

          <!-- Label Query Builder -->
          <div class="mb-4" v-if="selectedBaselineEvidence">
            <label class="inline-block pb-2 text-sm font-medium"
              >Label Conditions</label
            >

            <!-- Current conditions -->
            <div v-if="labelConditions.length > 0" class="mb-3 space-y-2">
              <div
                v-for="(condition, index) in labelConditions"
                :key="index"
                class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-md"
              >
                <span class="text-sm font-mono flex-1"
                  >{{ condition.name }}={{ condition.value }}</span
                >
                <Button
                  type="button"
                  severity="danger"
                  text
                  size="small"
                  @click="removeLabelCondition(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </div>

            <!-- Add new condition -->
            <div class="flex gap-2 items-end">
              <div class="flex-1">
                <label class="text-xs text-gray-500 dark:text-slate-400"
                  >Label Name</label
                >
                <Select
                  v-model="newLabelName"
                  :options="availableLabelNames"
                  placeholder="Select label..."
                  class="w-full"
                />
              </div>
              <div class="flex-1">
                <label class="text-xs text-gray-500 dark:text-slate-400"
                  >Value</label
                >
                <Select
                  v-model="newLabelValue"
                  :options="availableLabelValues"
                  placeholder="Select value..."
                  :disabled="!newLabelName"
                  class="w-full"
                />
              </div>
              <Button
                type="button"
                severity="secondary"
                @click="addLabelCondition"
                :disabled="!newLabelName || !newLabelValue"
              >
                Add
              </Button>
            </div>
          </div>

          <!-- Generated Filter Preview -->
          <div class="mb-4" v-if="computedFilter">
            <label class="inline-block pb-2 text-sm font-medium"
              >Generated Filter</label
            >
            <div
              class="p-3 bg-gray-100 dark:bg-slate-800 rounded-md text-sm font-mono break-all"
            >
              {{ computedFilter }}
            </div>
          </div>

          <div class="text-right">
            <secondary-button @click="resetEvidenceLinkingForm"
              >Cancel</secondary-button
            >
            <primary-button type="submit" :disabled="!computedFilter"
              >Create Dashboard</primary-button
            >
          </div>
        </form>
      </div>
    </div>
    <div v-else>
      <Button
        label="Create Statement"
        @click="showCreateStatementModal = true"
        class="text-green-600 hover:text-green-800 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
      </Button>
      <div class="mt-6">
        <h4 class="m-0 mb-2 font-medium text-base">Suggested Components</h4>
        <p class="text-sm text-gray-500">
          Suggested components will be available after you create this
          statement.
        </p>
      </div>
    </div>
  </div>

  <Dialog v-model:visible="showCreateStatementModal" size="lg" modal>
    <template #header>
      <TooltipTitle
        text="Create New Statement"
        tooltip-key="control.implementation.statement"
        position="bottom"
      />
    </template>
    <StatementCreateForm
      :ssp-id="system.securityPlan?.uuid || ''"
      :req-id="implementation.uuid || ''"
      :smt-id="partid || ''"
      @cancel="showCreateStatementModal = false"
      @created="updateStatement"
    />
  </Dialog>
  <Dialog v-model:visible="showEditStatementModal" size="lg" modal>
    <template #header>
      <TooltipTitle
        text="Edit Statement"
        tooltip-key="control.implementation.statement"
        position="bottom"
      />
    </template>
    <StatementEditForm
      v-if="localStatement"
      :ssp-id="system.securityPlan?.uuid || ''"
      :req-id="implementation.uuid || ''"
      :statement="localStatement"
      @cancel="showEditStatementModal = false"
      @saved="updateStatement"
    />
  </Dialog>
  <Dialog
    v-model:visible="showCreateComponentModal"
    modal
    header="Create System Component"
  >
    <SystemImplementationComponentCreateForm
      :ssp-id="resolvedSspId || ''"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Dialog>
</template>

<style scoped></style>
