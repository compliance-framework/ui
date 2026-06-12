<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import type {
  ByComponent,
  ControlImplementation,
  ImplementedRequirement,
  Risk,
  Statement,
  SystemComponent,
} from '@/oscal';
import { computed, nextTick, onMounted, ref, toValue, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Dashboard } from '@/stores/filters.ts';
import type { Evidence } from '@/stores/evidence.ts';
import { useSystemStore } from '@/stores/system.ts';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useToggle } from '@/composables/useToggle';
import {
  useAuthenticatedInstance,
  useDataApi,
  decamelizeKeys,
} from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import StatementCreateForm from '@/components/system-security-plans/StatementCreateForm.vue';
import StatementEditForm from '@/components/system-security-plans/StatementEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import DashboardEvidenceCounter from '@/views/control-implementations/partials/DashboardEvidenceCounter.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import Message from '@/volt/Message.vue';
import ControlStatementMetadata from './ControlStatementMetadata.vue';
import ControlStatementSuggestions from './ControlStatementSuggestions.vue';
import ControlStatementByComponents from './ControlStatementByComponents.vue';
import CreateByComponentForm from './CreateByComponentForm.vue';
import DashboardLinkForm from './DashboardLinkForm.vue';
import EvidenceDashboardForm from './EvidenceDashboardForm.vue';
import type { LabelCondition, SearchableEvidence } from './form-options';
import {
  buildApplySuggestionEndpoint,
  buildApplySuggestionsEndpoint,
  buildByComponentsEndpoint,
  buildSuggestComponentsEndpoint,
  getExistingComponentUuidSet,
  getUnappliedSuggestions,
  normalizeSuggestedComponentsResponse,
  type SuggestedComponent,
  type SystemComponentSuggestion,
} from '@/views/control-implementations/partials/component-suggestions';
import {
  implementationStatusOptionsWithNone,
  normalizeByComponentImplementationStatus,
} from './implementation-status';

const { system } = useSystemStore();
const toast = useToast();
const router = useRouter();
const axios = useAuthenticatedInstance();

const showCreateStatementModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateComponentModal = ref(false);

const { value: showEvidenceLinkingForm, set: setEvidenceLinkingForm } =
  useToggle(false);
const evidenceDashboard = ref<{ name: string; filter: string }>({
  name: '',
  filter: '',
});

const availableEvidence = ref<SearchableEvidence[]>([]);
const selectedBaselineEvidence = ref<SearchableEvidence | null>(null);
const evidenceLoading = ref(false);

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
const createByComponentError = ref('');
const creatingByComponent = ref(false);
const linkDashboardError = ref('');
const linkingDashboard = ref(false);
const createEvidenceDashboardError = ref('');
const creatingEvidenceDashboard = ref(false);

const route = useRoute();

const {
  statement,
  implementation,
  sspId: providedSspId,
  partid,
  displaySections,
} = defineProps<{
  statement?: Statement;
  implementation: ImplementedRequirement;
  sspId?: string;
  partid?: string;
  displaySections?: Array<'metadata' | 'components' | 'evidence' | 'create'>;
}>();

const RISK_FETCH_LIMIT = 100;

const localStatement = ref<Statement | undefined>(statement);
const activeDisplaySections = computed(
  () => displaySections ?? ['metadata', 'components', 'evidence', 'create'],
);
const showMetadataSection = computed(() =>
  activeDisplaySections.value.includes('metadata'),
);
const showComponentsSection = computed(() =>
  activeDisplaySections.value.includes('components'),
);
const showEvidenceSection = computed(() =>
  activeDisplaySections.value.includes('evidence'),
);
const showCreateStatementAction = computed(() =>
  activeDisplaySections.value.includes('create'),
);
const createOnlySection = computed(
  () =>
    activeDisplaySections.value.length === 1 &&
    activeDisplaySections.value[0] === 'create',
);

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
const { data: sspRisks, execute: fetchSspRisks } = useDataApi<Risk[]>(
  null,
  {},
  { immediate: false },
);
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
const pinnedAppliedSuggestions = ref<SuggestedComponent[]>([]);
const suggestionsLoading = ref(false);
const suggestionsError = ref('');
const applyingSuggestedComponentUuids = ref<string[]>([]);
const applyingAllSuggestions = ref(false);
let latestSuggestionsRequestId = 0;
const suggestionsDebugEnabled = import.meta.env.DEV;

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
    if (!id) {
      sspRisks.value = [];
      return;
    }
    const query = new URLSearchParams({ limit: `${RISK_FETCH_LIMIT}` });
    await Promise.allSettled([
      fetchComponents(
        `/api/oscal/system-security-plans/${id}/system-implementation/components`,
      ),
      fetchSspRisks(
        `/api/oscal/system-security-plans/${id}/risks?${query.toString()}`,
      ),
    ]);
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
  const mergedByUuid = new Map<string, SuggestedComponent>();
  for (const suggestion of suggestedComponents.value) {
    mergedByUuid.set(suggestion.componentUuid, suggestion);
  }
  for (const suggestion of pinnedAppliedSuggestions.value) {
    if (!mergedByUuid.has(suggestion.componentUuid)) {
      mergedByUuid.set(suggestion.componentUuid, suggestion);
    }
  }

  return Array.from(mergedByUuid.values()).map((suggestion) => {
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
const pinnedAppliedSuggestionUuidSet = computed(
  () =>
    new Set(pinnedAppliedSuggestions.value.map((item) => item.componentUuid)),
);
const appliedSuggestionUuids = computed(
  () =>
    new Set([
      ...existingComponentUuidSet.value,
      ...pinnedAppliedSuggestionUuidSet.value,
    ]),
);
const applyingSuggestionUuids = computed(
  () => new Set(applyingSuggestedComponentUuids.value),
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
  (value, previousValue) => {
    if (value?.uuid !== previousValue?.uuid) {
      pinnedAppliedSuggestions.value = [];
    }
    localStatement.value = value;
  },
  { immediate: true },
);

function buildNewByComponent(): ByComponent {
  return {
    uuid: uuidv4(),
    implementationStatus: {
      state: '',
    },
  } as ByComponent;
}

function buildByComponentCreatePayload(byComponent: ByComponent): ByComponent {
  const payload: ByComponent = {
    ...byComponent,
    uuid: uuidv4(),
  };
  return normalizeByComponentPayload(payload);
}

function normalizeByComponentPayload(byComponent: ByComponent): ByComponent {
  return normalizeByComponentImplementationStatus(byComponent);
}

const newByComponent = ref<ByComponent>(buildNewByComponent());
const newByComponentStatusState = computed({
  get: () => newByComponent.value.implementationStatus?.state ?? '',
  set: (state: string) => {
    if (!state) {
      newByComponent.value.implementationStatus = {
        state: '',
      };
      return;
    }
    newByComponent.value.implementationStatus = {
      ...(newByComponent.value.implementationStatus ?? {}),
      state,
    };
  },
});
const newByComponentStatusRemarks = computed({
  get: () => newByComponent.value.implementationStatus?.remarks ?? '',
  set: (remarks: string) => {
    if (!newByComponentStatusState.value) {
      return;
    }
    newByComponent.value.implementationStatus = {
      ...(newByComponent.value.implementationStatus ?? {}),
      state: newByComponentStatusState.value,
      remarks,
    };
  },
});
const selectedComponent = ref<{ name?: string; value: string } | null>(null);
watch(selectedComponent, () => {
  // When the selected component changes, update the model
  newByComponent.value.componentUuid = selectedComponent.value?.value ?? '';
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
  return (
    existingComponentUuidSet.value.has(componentUuid) ||
    pinnedAppliedSuggestionUuidSet.value.has(componentUuid)
  );
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

function pinAppliedSuggestion(suggestion: SuggestedComponent) {
  if (
    pinnedAppliedSuggestions.value.some(
      (item) => item.componentUuid === suggestion.componentUuid,
    )
  ) {
    return;
  }
  pinnedAppliedSuggestions.value = [
    ...pinnedAppliedSuggestions.value,
    suggestion,
  ];
}

function logSuggestionsDebug(
  message: string,
  context: Record<string, unknown> = {},
) {
  if (!suggestionsDebugEnabled) {
    return;
  }
  console.info('[control-suggestions]', message, context);
}

function isCanceledRequestError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if ('code' in error && error.code === 'ERR_CANCELED') {
    return true;
  }
  if ('message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    return message.includes('canceled') || message.includes('aborted');
  }
  return false;
}

async function fetchSuggestedComponents() {
  const requestId = ++latestSuggestionsRequestId;
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  logSuggestionsDebug('fetch start', {
    requestId,
    latestSuggestionsRequestId,
    sspId,
    implementationUuid: implementation.uuid,
    statementUuid,
  });
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

    const normalizedSuggestions = normalizeSuggestedComponentsResponse(
      suggestedComponentsResponse.value,
    );
    suggestedComponents.value = normalizedSuggestions;
    logSuggestionsDebug('fetch success', {
      requestId,
      suggestionsCount: normalizedSuggestions.length,
    });
  } catch (error) {
    if (requestId !== latestSuggestionsRequestId) {
      return;
    }
    if (isCanceledRequestError(error)) {
      logSuggestionsDebug('fetch canceled', {
        requestId,
        error,
      });
      return;
    }
    console.error('Failed to fetch suggested components:', {
      requestId,
      sspId,
      implementationUuid: implementation.uuid,
      statementUuid,
      error,
    });
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
  implementationStatus = newByComponent.value.implementationStatus,
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
        ...buildByComponentCreatePayload({
          ...newByComponent.value,
          componentUuid,
          description,
          implementationStatus,
        } as ByComponent),
      },
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

async function syncStatementAfterSuggestionApply(options?: {
  refreshSuggestions?: boolean;
}) {
  const shouldRefreshSuggestions = options?.refreshSuggestions ?? false;
  const sspId = resolvedSspId.value;
  const statementUuid = localStatement.value?.uuid;
  if (!sspId || !statementUuid) {
    if (shouldRefreshSuggestions) {
      await fetchSuggestedComponents();
    }
    return;
  }

  try {
    const response = await axios.get<{ data?: ControlImplementation }>(
      `/api/oscal/system-security-plans/${sspId}/control-implementation`,
    );
    const implementationResponse = response.data?.data;
    if (!implementationResponse) {
      throw new Error(
        'The server did not return control implementation data for this statement.',
      );
    }

    const refreshedRequirement =
      implementationResponse.implementedRequirements?.find(
        (item) => item.uuid === implementation.uuid,
      );
    const refreshedStatement = refreshedRequirement?.statements?.find(
      (item) => item.uuid === statementUuid,
    );
    if (!refreshedStatement) {
      throw new Error('Unable to locate the refreshed statement data.');
    }

    localStatement.value = refreshedStatement;
    emit('updated', refreshedStatement);
  } catch (error) {
    console.error('Failed to sync statement after applying suggestion:', error);
    toast.add({
      severity: 'warn',
      summary: 'Refresh Needed',
      detail:
        'Suggestion was applied, but the latest statement data could not be loaded automatically.',
      life: 5000,
    });
  } finally {
    if (shouldRefreshSuggestions) {
      await fetchSuggestedComponents();
    }
  }
}

function resetCreateComponentForm() {
  setCreateComponentForm(false);
  createByComponentError.value = '';
  selectedComponent.value = null;

  newByComponent.value = buildNewByComponent();
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
  if (!localStatement.value) {
    console.error('No statement defined');
    return;
  }

  const updatedStatement: Statement = {
    ...localStatement.value,
    byComponents: [...(localStatement.value.byComponents ?? [])].filter(
      (comp: ByComponent) => byComp.uuid !== comp.uuid,
    ),
  };
  try {
    await executeDelete(
      `${buildByComponentsEndpoint(sspId, implementation.uuid, statementUuid)}/${byComp.uuid}`,
    );
    localStatement.value = updatedStatement;
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = buildNewByComponent();
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
        data: normalizeByComponentPayload(byComp),
      },
    );
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = buildNewByComponent();
  } catch (err) {
    console.error(err);
  }
}

async function createByComponent() {
  createByComponentError.value = '';
  if (!newByComponent.value.componentUuid) {
    return;
  }
  if (!localStatement.value?.uuid) {
    toast.add({
      severity: 'error',
      summary: 'Missing Statement',
      detail: 'Create or reload the statement before adding a component.',
      life: 4000,
    });
    return;
  }
  if (isSuggestionApplied(newByComponent.value.componentUuid)) {
    toast.add({
      severity: 'warn',
      summary: 'Component Already Linked',
      detail:
        'This component is already linked to the statement and cannot be reused.',
      life: 4000,
    });
    return;
  }
  creatingByComponent.value = true;
  try {
    const created = await createStatementByComponent(
      newByComponent.value.componentUuid,
      newByComponent.value.description ?? '',
      newByComponent.value.implementationStatus,
    );
    if (!created) {
      console.error('Failed to create: response data is missing');
      return;
    }
    if (!localStatement.value.byComponents) {
      localStatement.value.byComponents = [];
    }
    localStatement.value.byComponents.push(created);
    newByComponent.value = buildNewByComponent();
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
  } catch (error) {
    console.error(error);
    createByComponentError.value =
      error instanceof Error
        ? error.message
        : 'Unexpected error creating a by-component.';
  } finally {
    creatingByComponent.value = false;
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
  const sspId = resolvedSspId.value;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail:
        'Unable to apply suggestions until a system security plan is set.',
      life: 4000,
    });
    return;
  }
  if (isSuggestionApplied(suggestion.componentUuid)) {
    return;
  }
  if (!suggestion.componentDefinitionId || !suggestion.definedComponentId) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Suggestion Data',
      detail:
        'This suggestion is missing component identifiers and cannot be applied.',
      life: 5000,
    });
    return;
  }

  setSuggestionApplying(suggestion.componentUuid, true);
  try {
    await axios.post(
      buildApplySuggestionEndpoint(
        sspId,
        implementation.uuid,
        localStatement.value.uuid,
      ),
      {
        componentDefinitionId: suggestion.componentDefinitionId,
        definedComponentId: suggestion.definedComponentId,
      },
      {
        transformRequest: [decamelizeKeys],
      },
    );
    pinAppliedSuggestion(suggestion);
    await syncStatementAfterSuggestionApply();
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
  const sspId = resolvedSspId.value;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail:
        'Unable to apply suggestions until a system security plan is set.',
      life: 4000,
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
  try {
    await axios.post(
      buildApplySuggestionsEndpoint(
        sspId,
        implementation.uuid,
        localStatement.value.uuid,
      ),
    );
    for (const suggestion of suggestionsToApply) {
      pinAppliedSuggestion(suggestion);
    }
    await syncStatementAfterSuggestionApply();
    toast.add({
      severity: 'success',
      summary: 'Suggestions Applied',
      detail: `${suggestionsToApply.length} suggested component${suggestionsToApply.length === 1 ? '' : 's'} added.`,
      life: 3000,
    });
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
  components.value = [...(components.value ?? []), newComponent];
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
  createEvidenceDashboardError.value = '';
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
  linkDashboardError.value = '';
  if (!selectedDashboardToLink.value) return;

  const dashboard = selectedDashboardToLink.value;
  const controlId = implementation.controlId;

  // Add current control to the dashboard's controls
  const existingControlIds = dashboard.controls?.map((c) => c.id) || [];
  const newControlIds = [...existingControlIds, controlId];

  linkingDashboard.value = true;
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
    linkDashboardError.value =
      error instanceof Error
        ? error.message
        : 'Unexpected error linking dashboard.';
  } finally {
    linkingDashboard.value = false;
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
  createEvidenceDashboardError.value = '';
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
  creatingEvidenceDashboard.value = true;
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
    createEvidenceDashboardError.value =
      error instanceof Error
        ? error.message
        : 'Unexpected error creating evidence dashboard.';
  } finally {
    creatingEvidenceDashboard.value = false;
  }
}
</script>

<template>
  <div :class="createOnlySection ? '' : 'pb-24'">
    <div v-if="localStatement">
      <ControlStatementMetadata
        v-if="showMetadataSection"
        :statement="localStatement"
        @edit="showEditStatementModal = true"
      />

      <ControlStatementSuggestions
        v-if="showComponentsSection"
        :statement-ready="!!localStatement"
        :ssp-ready="!!resolvedSspId"
        :suggestions-loading="suggestionsLoading"
        :suggestions-error="suggestionsError"
        :displayed-suggestions="displayedSuggestions"
        :unapplied-suggestions="unappliedSuggestions"
        :all-suggestions-applied="allSuggestionsApplied"
        :applying-all-suggestions="applyingAllSuggestions"
        :applied-uuids="appliedSuggestionUuids"
        :applying-uuids="applyingSuggestionUuids"
        @apply-all="applyAllSuggestedComponents"
        @apply-suggestion="applySuggestedComponent"
      />

      <ControlStatementByComponents
        v-if="showComponentsSection && localStatement"
        :by-components="localStatement.byComponents || []"
        :control-id="implementation.controlId"
        :ssp-risks="sspRisks || []"
        :risk-fetch-limit="RISK_FETCH_LIMIT"
        @add-component="setCreateComponentForm(true)"
        @create-component="showCreateComponentModal = true"
        @save="updateByComponent"
        @delete="deleteByComponent"
      />

      <CreateByComponentForm
        v-if="showComponentsSection && showCreateComponentForm"
        v-model:selected-component="selectedComponent"
        v-model:description="newByComponent.description"
        v-model:status-state="newByComponentStatusState"
        v-model:status-remarks="newByComponentStatusRemarks"
        :component-items="componentItems"
        :status-options="implementationStatusOptionsWithNone"
        :components-loading="componentsLoading"
        :is-submitting="creatingByComponent"
        :server-error="createByComponentError"
        @submit="createByComponent"
        @cancel="resetCreateComponentForm"
        @create-component="showCreateComponentModal = true"
      />

      <!-- Evidence Linking Section -->
      <div v-if="showEvidenceSection" class="mt-8">
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
        <Message v-else-if="dashboardsLoading" severity="info" variant="simple">
          <span class="flex items-center gap-2">
            <i class="pi pi-spin pi-spinner"></i>
            Loading dashboards...
          </span>
        </Message>
        <div
          v-else-if="
            showEvidenceLinkingForm === false && showLinkExistingForm === false
          "
          class="mb-6"
        >
          <Message severity="secondary">
            No dashboards linked to this control yet.
          </Message>
        </div>

        <DashboardLinkForm
          v-if="showLinkExistingForm"
          v-model:selected-dashboard="selectedDashboardToLink"
          :dashboards="availableDashboardsToLink"
          :is-submitting="linkingDashboard"
          :server-error="linkDashboardError"
          @submit="linkExistingDashboard"
          @cancel="
            setLinkExistingForm(false);
            selectedDashboardToLink = null;
            linkDashboardError = '';
          "
        />

        <EvidenceDashboardForm
          v-if="showEvidenceLinkingForm"
          v-model:name="evidenceDashboard.name"
          v-model:selected-baseline-evidence="selectedBaselineEvidence"
          v-model:new-label-name="newLabelName"
          v-model:new-label-value="newLabelValue"
          :unique-evidence-titles="uniqueEvidenceTitles"
          :evidence-loading="evidenceLoading"
          :label-conditions="labelConditions"
          :available-label-names="availableLabelNames"
          :available-label-values="availableLabelValues"
          :computed-filter="computedFilter"
          :is-submitting="creatingEvidenceDashboard"
          :server-error="createEvidenceDashboardError"
          @submit="submitEvidenceLinking"
          @cancel="resetEvidenceLinkingForm"
          @add-condition="addLabelCondition"
          @remove-condition="removeLabelCondition"
        />
      </div>
    </div>
    <div v-else>
      <template v-if="showCreateStatementAction">
        <Button
          label="Create Statement"
          @click="showCreateStatementModal = true"
          class="text-green-600 hover:text-green-800 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
        </Button>
      </template>
      <div v-if="showComponentsSection" class="mt-6">
        <h4 class="m-0 mb-2 font-medium text-base">Suggested Components</h4>
        <Message severity="secondary">
          Suggested components will be available after you create this
          statement.
        </Message>
      </div>
      <div v-if="showEvidenceSection" class="mt-6">
        <h4 class="m-0 mb-2 font-medium text-base">Evidence Linking</h4>
        <Message severity="secondary">
          Evidence dashboards can be linked after you create this statement.
        </Message>
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
