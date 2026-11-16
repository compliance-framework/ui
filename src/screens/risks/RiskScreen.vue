<script setup lang="ts">
/**
 * A risk (/risks/:riskId, or under its system): its overview (lifecycle actions, owners, score
 * history, workflow state), evidence, controls and components it is linked to, threats,
 * suggested remediations, reviews, history and, once mitigation is planned, its mitigation plan,
 * as tabs in the address (?tab=). The script is the classic risk page's: it works out which
 * register the risk belongs to and where Back goes.
 */
import { cloneFnJSON as cloneDeep } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RiskAcceptModal from '@/components/risk/RiskAcceptModal.vue';
import RiskReviewModal from '@/components/risk/RiskReviewModal.vue';
import RiskScoreReviewModal from '@/components/risk/RiskScoreReviewModal.vue';
import RiskScoreHistoryWidget from '@/components/risk/RiskScoreHistoryWidget.vue';
import PromoteToPoamModal from '@/components/risk/PromoteToPoamModal.vue';
import RiskOwnerAssignment from '@/components/risk/RiskOwnerAssignment.vue';
import RiskPoamItemsTab from '@/components/risk/RiskPoamItemsTab.vue';
import { useSystemStore } from '@/stores/system';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';
import type { Risk, SystemComponent } from '@/oscal';
import type { Evidence, EvidenceLabel } from '@/stores/evidence';
import { useToast } from 'primevue/usetoast';
import {
  useDataApi,
  decamelizeKeys,
  useAuthenticatedInstance,
} from '@/composables/axios';
import {
  ALLOWED_RISK_TRANSITIONS,
  canAcceptRisk,
  canMarkMitigatingImplemented,
  canPromoteToPoam,
  canReassessRisk,
  canReopenRisk,
  canReviewRisk,
  getAllowedRiskTransitions,
  normalizeRiskRegisterStatus,
  normalizeOwnerAssignments,
  ownerAssignmentsSignature,
  riskStatusLabel,
  riskWorkflowHints,
  riskWorkflowStage,
  riskWorkflowStageSummary,
  type RiskOwnerAssignmentsPayload,
  type RiskReviewDecision,
} from '@/utils/risk-workflow';
import { usePromoteRiskToPoam } from '@/composables/usePoamItems';
import {
  getRiskImpact,
  getRiskLikelihood,
  getRiskReviewDeadline,
} from '@/utils/risk-register';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  buildRiskRemediationCollectionEndpoint,
  buildRiskRemediationItemEndpoint,
  buildRiskThreatCollectionEndpoint,
  buildRiskThreatItemEndpoint,
  resolveRiskContext,
  type RiskContext,
} from '@/utils/risk-context';
import {
  getRiskAssociations,
  normalizeRiskEvents,
  normalizeRiskReviews,
  type RiskAssociationItem,
  type RiskAssociationKind,
  type RiskEventItem,
  type RiskReviewItem,
} from '@/utils/risk-detail';
import { getRiskIdentifier } from '@/utils/risk-id';
import {
  normalizeRiskScoreSnapshots,
  type RiskScoreSnapshot,
} from '@/utils/risk-dashboard';
import type { PoamItem } from '@/types/poam-items';
import type { DataResponse } from '@/stores/types';

interface AssociationPickerOption extends RiskAssociationItem {
  subtitle?: string;
  catalogId?: string;
  labels?: EvidenceLabel[];
}

interface RiskEvidenceLink {
  riskId: string;
  evidenceId: string;
}

interface RiskControlLink {
  riskId: string;
  catalogId: string | undefined;
  controlId: string;
}

interface RiskComponentLink {
  riskId: string;
  componentId: string;
}

interface ResolvedControlWithCatalog {
  controlId: string;
  catalogId: string;
  title?: string;
  class?: string;
}

interface ThreatTabItem {
  threatRefId?: string;
  id: string;
  system: string;
  title: string;
  url: string;
  safeUrl: string;
}

interface EditableThreat {
  id: string;
  system: string;
  title: string;
  url: string;
  threatRefId?: string;
}

interface EditableRemediation {
  id?: string;
  title: string;
  description: string;
  tasks: string[];
}

interface RemediationTabItem {
  id?: string;
  title: string;
  description: string;
  tasks: Array<{
    id?: string;
    title: string;
    orderIndex?: number;
  }>;
  lifecycle?: string;
  remarks?: string;
}

interface RiskAcceptSubmitPayload {
  justification: string;
  reviewDeadline: string;
  ownerUpdate?: RiskOwnerAssignmentsPayload;
}

interface RiskReviewSubmitPayload {
  decision: Extract<RiskReviewDecision, 'extend' | 'reopen'>;
  notes?: string;
  nextReviewDeadline?: string;
}

type RiskScoreLevel = 'low' | 'moderate' | 'high' | 'critical';

interface RiskScoreReviewSubmitPayload {
  decision: Extract<RiskReviewDecision, 'reassess'>;
  likelihood: RiskScoreLevel;
  impact: RiskScoreLevel;
  notes?: string;
}

interface RouterHistoryStateLike {
  back?: unknown;
}

type TabId =
  | 'overview'
  | 'evidence'
  | 'controls'
  | 'components'
  | 'threats'
  | 'remediations'
  | 'reviews'
  | 'history-events'
  | 'poam-items';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const systemStore = useSystemStore();
const sspStore = useSystemSecurityPlanStore();
const authenticatedApi = useAuthenticatedInstance();

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

const isSspContext = computed(() => context.value?.scope === 'ssp');

const tabs = computed<Array<{ id: TabId; label: string }>>(() => {
  const baseTabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'controls', label: 'Controls' },
    { id: 'components', label: 'Components' },
    { id: 'threats', label: 'Threats' },
    { id: 'remediations', label: 'Suggested Remediations' },
  ];

  baseTabs.push(
    { id: 'reviews', label: 'Reviews' },
    { id: 'history-events', label: 'History & Events' },
  );

  const status = risk.value?.status;
  if (status === 'mitigating-planned' || status === 'mitigating-implemented') {
    baseTabs.push({ id: 'poam-items', label: 'Mitigation Plan' });
  }

  return baseTabs;
});

const missingContextTitle = computed(() =>
  isSspRoute.value
    ? 'System Security Plan context missing'
    : 'Remediation Plan context missing',
);
const missingContextDetail = computed(() =>
  isSspRoute.value
    ? 'Unable to determine the System Security Plan that owns this risk.'
    : 'Unable to determine the Remediation Plan that owns this risk.',
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

const { data: fetchedAssociationLinks, execute: executeFetchAssociationLinks } =
  useDataApi<unknown[]>(null, {}, { immediate: false });

const { data: fetchedComponentDetail, execute: executeLoadComponentDetail } =
  useDataApi<SystemComponent>(null, {}, { immediate: false });

const { isLoading: savingAssociation, execute: executeAssociationMutation } =
  useDataApi<unknown>(
    null,
    { transformRequest: [decamelizeKeys] },
    { immediate: false },
  );

const {
  data: fetchedLinkedPoamItems,
  isLoading: loadingLinkedPoamItems,
  execute: executeFetchLinkedPoamItems,
} = useDataApi<PoamItem[]>(null, {}, { immediate: false });

const {
  data: mutatedRisk,
  isLoading: mutatingRisk,
  execute: executeRiskMutation,
} = useDataApi<Risk>(
  null,
  { transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const {
  data: fetchedEvents,
  response: fetchedEventsResponse,
  isLoading: loadingEvents,
  execute: executeFetchEvents,
} = useDataApi<unknown>(null, {}, { immediate: false });

const {
  data: fetchedReviews,
  response: fetchedReviewsResponse,
  isLoading: loadingReviews,
  execute: executeFetchReviews,
} = useDataApi<unknown>(null, {}, { immediate: false });

const {
  data: fetchedScoreHistory,
  response: fetchedScoreHistoryResponse,
  isLoading: loadingScoreHistory,
  execute: executeFetchScoreHistory,
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

const loadingProfileBindings = ref(false);

const availableControlsWithCatalog = ref<
  ResolvedControlWithCatalog[] | undefined
>(undefined);

const risk = ref<Risk | null>(null);
const riskEvents = ref<RiskEventItem[]>([]);
const riskReviews = ref<RiskReviewItem[]>([]);
const riskScoreHistory = ref<RiskScoreSnapshot[]>([]);
const evidenceAssociations = ref<AssociationPickerOption[]>([]);
const controlAssociations = ref<AssociationPickerOption[]>([]);
const componentAssociations = ref<AssociationPickerOption[]>([]);
const notFound = ref(false);
const loadError = ref('');
const scoreHistoryLoadError = ref(false);
let scoreHistoryLoadToken = 0;

// The tab is in the address (?tab=), so the route tabs, Back and deep links agree.
const activeTab = computed<TabId>({
  get: () => {
    const tab = route.query.tab;
    return typeof tab === 'string' && tab ? (tab as TabId) : 'overview';
  },
  set: (tab: TabId) => {
    const query = { ...route.query };
    if (tab === 'overview') delete query.tab;
    else query.tab = tab;
    void router.replace({ query });
  },
});
const routeTabs = computed(() =>
  tabs.value.map((tab) => {
    const query = { ...route.query };
    if (tab.id === 'overview') delete query.tab;
    else query.tab = tab.id;
    return { label: tab.label, to: { query } };
  }),
);
const showAcceptModal = ref(false);
const showReviewModal = ref(false);
const showScoreReviewModal = ref(false);
const showPromoteToPoamModal = ref(false);
const timelinePageSize = 10;
// Keep score history bounded so the Overview tab cannot issue unbounded requests.
const scoreHistoryPageSize = 100;
const scoreHistoryMaxSnapshots = 1000;
const eventsPage = ref(1);
const eventsHasMore = ref(false);
const eventsTotalPages = ref<number | null>(null);
const reviewsPage = ref(1);
const reviewsHasMore = ref(false);
const reviewsTotalPages = ref<number | null>(null);
const ownerAssignmentsDraft = ref<RiskOwnerAssignmentsPayload>({
  ownerAssignments: [],
});
const ownerAssignmentsSnapshot = ref<RiskOwnerAssignmentsPayload>({
  ownerAssignments: [],
});
const ownerAssignmentsSnapshotSignature = ref('');
const ownerAssignmentsResetKey = ref(0);
const ownerSaveError = ref('');
const showThreatEditor = ref(false);
const showRemediationEditor = ref(false);
const threatEditingKey = ref<string | null>(null);
const remediationEditingId = ref<string | null>(null);
const workingThreat = ref<EditableThreat>({
  id: '',
  system: '',
  title: '',
  url: '',
});
const workingRemediation = ref<EditableRemediation>({
  title: '',
  description: '',
  tasks: [],
});

const resolvedRiskId = computed(
  () => getRiskIdentifier(risk.value) || riskId.value || '',
);

const detailEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskItemEndpoint(context.value, resolvedRiskId.value);
});

const threatCollectionEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskThreatCollectionEndpoint(context.value, resolvedRiskId.value);
});

const remediationCollectionEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskRemediationCollectionEndpoint(
    context.value,
    resolvedRiskId.value,
  );
});

const remediationTemplateResource = computed(() => {
  const source = toRecord(risk.value);
  return source ? toRecord(source.remediationTemplate) : null;
});

const hasRemediationTemplateResource = computed(
  () => remediationTemplateResource.value !== null,
);

const threatEditorTitle = computed(() =>
  threatEditingKey.value ? 'Edit Threat' : 'Add Threat',
);

const remediationEditorTitle = computed(() =>
  remediationEditingId.value ? 'Edit Remediation' : 'Add Remediation',
);

function openedFromSystemRisksRoute(): boolean {
  const from = route.query.from;
  if (Array.isArray(from)) {
    return from.includes('system');
  }
  return from === 'system';
}

function riskListRouteByContext() {
  if (openedFromSystemRisksRoute()) {
    return { name: 'system:risks' };
  }

  if (!context.value) {
    return { name: 'risks:index' };
  }

  if (context.value.scope === 'ssp') {
    if (context.value.listRouteName === 'system-security-plan-risks') {
      return {
        name: context.value.listRouteName,
        params: { id: context.value.id },
      };
    }
    return { name: 'risks:index' };
  }

  return {
    name: context.value.listRouteName,
    params: { id: context.value.id },
  };
}

function hasInAppBackTarget(): boolean {
  if (typeof window === 'undefined') return false;
  const backTarget = (window.history.state as RouterHistoryStateLike | null)
    ?.back;
  return typeof backTarget === 'string' && backTarget.length > 0;
}

// Tabs add history entries, so Back steps over them to wherever the risk was opened from.
const entryPosition = historyPosition();
const enteredWithBackTarget = hasInAppBackTarget();

function historyPosition(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const position = (window.history.state as { position?: unknown } | null)
    ?.position;
  return typeof position === 'number' ? position : undefined;
}

function goBackToPreviousPage() {
  if (enteredWithBackTarget) {
    const now = historyPosition();
    const tabSteps =
      now !== undefined && entryPosition !== undefined
        ? Math.max(0, now - entryPosition)
        : 0;
    router.go(-(tabSteps + 1));
    return;
  }
  void router.push(riskListRouteByContext());
}

const loading = computed(() => loadingRisk.value || loadingRiskList.value);
const saving = computed(() => savingAssociation.value || mutatingRisk.value);
const workflowSubmitting = computed(() => mutatingRisk.value);

function isCanceledError(err: unknown): boolean {
  const maybeError = err as { message?: string; code?: string };
  return (
    maybeError?.code === 'ERR_CANCELED' ||
    maybeError?.message?.toLowerCase() === 'canceled'
  );
}

function extractErrorMessage(
  err: unknown,
  fallback = 'Unable to complete request.',
): string {
  const maybeError = err as {
    message?: string;
    response?: { data?: { errors?: { body?: string } } };
  };

  return (
    maybeError?.response?.data?.errors?.body || maybeError?.message || fallback
  );
}

const riskEventsEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  const base = buildRiskItemEndpoint(context.value, resolvedRiskId.value);
  return `${base}/events`;
});

const riskReviewsEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  const base = buildRiskItemEndpoint(context.value, resolvedRiskId.value);
  return `${base}/reviews`;
});

const riskScoreHistoryEndpoint = computed(() => {
  if (!resolvedRiskId.value) return null;
  if (context.value?.scope === 'ssp') {
    const base = buildRiskItemEndpoint(context.value, resolvedRiskId.value);
    return `${base}/score-history`;
  }
  return `/api/risks/${encodeURIComponent(resolvedRiskId.value)}/score-history`;
});

function readNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBoolean(
  record: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
  }
  return undefined;
}

interface TimelinePaginationMetadata {
  explicitPagination: boolean;
  hasMore: boolean;
  totalPages?: number;
  currentPage?: number;
}

function resolveTimelinePagination(
  rawValue: unknown,
  requestedOffset: number,
  requestedLimit: number,
  itemCount: number,
): TimelinePaginationMetadata {
  const candidates: Array<Record<string, unknown>> = [];
  const root = toRecord(rawValue);
  if (root) {
    candidates.push(root);
    ['data', 'meta', 'pagination'].forEach((key) => {
      const nested = toRecord(root[key]);
      if (nested) {
        candidates.push(nested);
        ['meta', 'pagination'].forEach((nestedKey) => {
          const deepNested = toRecord(nested[nestedKey]);
          if (deepNested) {
            candidates.push(deepNested);
          }
        });
      }
    });
  }

  let explicitPagination = false;
  let total = 0;
  let limit = requestedLimit;
  let offset = requestedOffset;
  let hasMore: boolean | undefined;
  let pageNumber: number | undefined;
  let totalPages: number | undefined;

  for (const candidate of candidates) {
    const candidateTotal = readNumber(candidate, [
      'total',
      'count',
      'totalItems',
    ]);
    if (candidateTotal !== undefined) {
      explicitPagination = true;
      total = candidateTotal;
    }

    const candidateLimit = readNumber(candidate, [
      'limit',
      'size',
      'pageSize',
      'perPage',
    ]);
    if (candidateLimit !== undefined && candidateLimit > 0) {
      explicitPagination = true;
      limit = candidateLimit;
    }

    const candidateOffset = readNumber(candidate, ['offset']);
    if (candidateOffset !== undefined && candidateOffset >= 0) {
      explicitPagination = true;
      offset = candidateOffset;
    }

    const candidatePage = readNumber(candidate, ['page', 'currentPage']);
    if (candidatePage !== undefined && candidatePage > 0) {
      explicitPagination = true;
      pageNumber = candidatePage;
    }

    const candidateTotalPages = readNumber(candidate, ['totalPages', 'pages']);
    if (candidateTotalPages !== undefined && candidateTotalPages >= 0) {
      explicitPagination = true;
      totalPages = candidateTotalPages;
    }

    const candidateHasMore = readBoolean(candidate, [
      'hasMore',
      'hasNext',
      'nextPage',
    ]);
    if (candidateHasMore !== undefined) {
      explicitPagination = true;
      hasMore = candidateHasMore;
    }
  }

  if (pageNumber !== undefined && offset === requestedOffset) {
    offset = (Math.max(1, pageNumber) - 1) * limit;
  }

  if (
    hasMore === undefined &&
    totalPages !== undefined &&
    pageNumber !== undefined
  ) {
    hasMore = pageNumber < totalPages;
  }

  if (hasMore === undefined && total > 0) {
    hasMore = offset + itemCount < total;
  }

  if (hasMore === undefined) {
    hasMore = itemCount >= limit && itemCount > 0;
  }

  if (totalPages === undefined && total > 0 && limit > 0) {
    totalPages = Math.max(1, Math.ceil(total / limit));
  }

  return {
    explicitPagination,
    hasMore,
    totalPages,
    currentPage: pageNumber,
  };
}

function pagedTimelineEndpoint(
  baseEndpoint: string,
  page: number,
  limit: number,
): string {
  const offset = (page - 1) * limit;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    offset: String(offset),
  });
  return `${baseEndpoint}?${query.toString()}`;
}

async function loadRiskEvents(page = eventsPage.value) {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * timelinePageSize;

  if (!risk.value) {
    riskEvents.value = [];
    eventsPage.value = 1;
    eventsHasMore.value = false;
    eventsTotalPages.value = null;
    return;
  }

  const applyFallbackEvents = () => {
    const normalizedFallback = normalizeRiskEvents(
      [],
      risk.value?.riskLog?.entries,
    );
    riskEvents.value = normalizedFallback.slice(
      offset,
      offset + timelinePageSize,
    );
    eventsPage.value = safePage;
    eventsHasMore.value = offset + timelinePageSize < normalizedFallback.length;
    eventsTotalPages.value = normalizedFallback.length
      ? Math.max(1, Math.ceil(normalizedFallback.length / timelinePageSize))
      : null;
  };

  const applyEmptyEventsPage = (
    pagination?: ReturnType<typeof resolveTimelinePagination>,
  ) => {
    riskEvents.value = [];
    eventsPage.value =
      pagination?.explicitPagination && pagination.currentPage
        ? pagination.currentPage
        : safePage;
    eventsHasMore.value = pagination?.explicitPagination
      ? pagination.hasMore
      : false;
    eventsTotalPages.value = pagination?.explicitPagination
      ? pagination.totalPages || null
      : null;
  };

  if (!riskEventsEndpoint.value) {
    applyFallbackEvents();
    return;
  }

  try {
    await executeFetchEvents(
      pagedTimelineEndpoint(
        riskEventsEndpoint.value,
        safePage,
        timelinePageSize,
      ),
    );
    const eventsEnvelopePayload = fetchedEventsResponse?.value?.data;
    const rawEventsPayload = eventsEnvelopePayload ?? fetchedEvents.value;
    const normalizedApiEvents = normalizeRiskEvents(rawEventsPayload, []);
    const pagination = resolveTimelinePagination(
      rawEventsPayload,
      offset,
      timelinePageSize,
      normalizedApiEvents.length,
    );
    if (normalizedApiEvents.length > 0) {
      const likelyFullUnpagedList =
        !pagination.explicitPagination &&
        normalizedApiEvents.length > timelinePageSize;
      riskEvents.value = likelyFullUnpagedList
        ? normalizedApiEvents.slice(offset, offset + timelinePageSize)
        : normalizedApiEvents;
      eventsPage.value =
        pagination.explicitPagination && pagination.currentPage
          ? pagination.currentPage
          : safePage;
      eventsHasMore.value = pagination.explicitPagination
        ? pagination.hasMore
        : likelyFullUnpagedList
          ? offset + timelinePageSize < normalizedApiEvents.length
          : normalizedApiEvents.length >= timelinePageSize;
      eventsTotalPages.value = pagination.explicitPagination
        ? pagination.totalPages || null
        : likelyFullUnpagedList
          ? Math.max(
              1,
              Math.ceil(normalizedApiEvents.length / timelinePageSize),
            )
          : null;
      return;
    }

    if (safePage === 1) {
      applyFallbackEvents();
      return;
    }

    applyEmptyEventsPage(pagination);
    return;
  } catch (err) {
    if (isCanceledError(err)) return;
  }

  if (safePage === 1) {
    applyFallbackEvents();
    return;
  }

  applyEmptyEventsPage();
}

async function loadRiskReviews(page = reviewsPage.value) {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * timelinePageSize;

  if (!risk.value) {
    riskReviews.value = [];
    reviewsPage.value = 1;
    reviewsHasMore.value = false;
    reviewsTotalPages.value = null;
    return;
  }

  if (!riskReviewsEndpoint.value) {
    riskReviews.value = [];
    reviewsPage.value = 1;
    reviewsHasMore.value = false;
    reviewsTotalPages.value = null;
    return;
  }

  try {
    await executeFetchReviews(
      pagedTimelineEndpoint(
        riskReviewsEndpoint.value,
        safePage,
        timelinePageSize,
      ),
    );
    const reviewsEnvelopePayload = fetchedReviewsResponse?.value?.data;
    const rawReviewsPayload = reviewsEnvelopePayload ?? fetchedReviews.value;
    const normalizedApiReviews = normalizeRiskReviews(rawReviewsPayload);
    const pagination = resolveTimelinePagination(
      rawReviewsPayload,
      offset,
      timelinePageSize,
      normalizedApiReviews.length,
    );
    const likelyFullUnpagedList =
      !pagination.explicitPagination &&
      normalizedApiReviews.length > timelinePageSize;
    riskReviews.value = likelyFullUnpagedList
      ? normalizedApiReviews.slice(offset, offset + timelinePageSize)
      : normalizedApiReviews;
    reviewsPage.value =
      pagination.explicitPagination && pagination.currentPage
        ? pagination.currentPage
        : safePage;
    reviewsHasMore.value = pagination.explicitPagination
      ? pagination.hasMore
      : likelyFullUnpagedList
        ? offset + timelinePageSize < normalizedApiReviews.length
        : normalizedApiReviews.length >= timelinePageSize;
    reviewsTotalPages.value = pagination.explicitPagination
      ? pagination.totalPages || null
      : likelyFullUnpagedList
        ? Math.max(1, Math.ceil(normalizedApiReviews.length / timelinePageSize))
        : null;
    return;
  } catch (err) {
    if (isCanceledError(err)) return;
  }

  riskReviews.value = [];
  reviewsPage.value = safePage;
  reviewsHasMore.value = false;
  reviewsTotalPages.value = null;
}

async function loadRiskScoreHistory() {
  const loadToken = (scoreHistoryLoadToken += 1);
  const endpoint = riskScoreHistoryEndpoint.value;
  const riskIdForLoad = resolvedRiskId.value;
  const isCurrentLoad = () =>
    loadToken === scoreHistoryLoadToken &&
    endpoint === riskScoreHistoryEndpoint.value &&
    riskIdForLoad === resolvedRiskId.value;

  riskScoreHistory.value = [];
  scoreHistoryLoadError.value = false;

  if (!risk.value || !endpoint) {
    return;
  }

  const snapshots: RiskScoreSnapshot[] = [];

  try {
    for (
      let page = 1;
      page <= Math.ceil(scoreHistoryMaxSnapshots / scoreHistoryPageSize);
      page += 1
    ) {
      if (!isCurrentLoad()) return;

      const pagedEndpoint = pagedTimelineEndpoint(
        endpoint,
        page,
        scoreHistoryPageSize,
      );
      await executeFetchScoreHistory(pagedEndpoint);

      if (!isCurrentLoad()) return;

      const envelopePayload = fetchedScoreHistoryResponse?.value?.data;
      const rawPayload = envelopePayload ?? fetchedScoreHistory.value;
      const pageSnapshots = normalizeRiskScoreSnapshots(rawPayload);
      snapshots.push(...pageSnapshots);

      const pagination = resolveTimelinePagination(
        rawPayload,
        (page - 1) * scoreHistoryPageSize,
        scoreHistoryPageSize,
        pageSnapshots.length,
      );
      const unpagedResponse = !pagination.explicitPagination;

      if (
        unpagedResponse ||
        !pagination.hasMore ||
        pageSnapshots.length === 0 ||
        snapshots.length >= scoreHistoryMaxSnapshots
      ) {
        break;
      }
    }

    if (!isCurrentLoad()) return;

    riskScoreHistory.value = snapshots.slice(0, scoreHistoryMaxSnapshots);
  } catch (err) {
    if (isCanceledError(err)) return;
    if (!isCurrentLoad()) return;
    scoreHistoryLoadError.value = true;
    riskScoreHistory.value = [];
  }
}

async function loadRisk() {
  loadError.value = '';
  notFound.value = false;
  risk.value = null;
  riskEvents.value = [];
  riskReviews.value = [];
  scoreHistoryLoadToken += 1;
  riskScoreHistory.value = [];
  scoreHistoryLoadError.value = false;
  evidenceAssociations.value = [];
  controlAssociations.value = [];
  componentAssociations.value = [];
  showAcceptModal.value = false;
  showReviewModal.value = false;
  showScoreReviewModal.value = false;
  showPromoteToPoamModal.value = false;
  eventsPage.value = 1;
  eventsHasMore.value = false;
  eventsTotalPages.value = null;
  reviewsPage.value = 1;
  reviewsHasMore.value = false;
  reviewsTotalPages.value = null;
  ownerSaveError.value = '';
  ownerAssignmentsDraft.value = { ownerAssignments: [] };
  ownerAssignmentsSnapshot.value = { ownerAssignments: [] };
  ownerAssignmentsSnapshotSignature.value = '';
  let detailFetchError: unknown = null;

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
    detailFetchError = err;
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
      loadError.value = extractErrorMessage(err, 'Unable to load risk.');
      return;
    }
  }

  if (!risk.value) {
    const detailStatus = (
      detailFetchError as { response?: { status?: number } }
    )?.response?.status;
    if (detailFetchError && detailStatus !== 404) {
      loadError.value = extractErrorMessage(
        detailFetchError,
        'Unable to load risk.',
      );
      return;
    }
    notFound.value = true;
    return;
  }

  const resolvedRiskIdentifier = getRiskIdentifier(risk.value);
  if (resolvedRiskIdentifier) {
    try {
      await executeFetchLinkedPoamItems(
        `/api/poam-items?riskId=${encodeURIComponent(resolvedRiskIdentifier)}`,
      );
    } catch (err) {
      if (isCanceledError(err)) return;
    }
  }

  syncAssociationsFromRisk();
  syncOwnerAssignmentsFromRisk();
  await refreshAllAssociationLinks();
  await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
  void loadRiskScoreHistory();
}

watch(
  [detailEndpoint, listEndpoint, riskId],
  () => {
    void loadRisk();
  },
  { immediate: true },
);

watch(
  tabs,
  (nextTabs) => {
    // Wait for the risk: a deep link to the Mitigation Plan tab is only valid once it loads.
    if (risk.value && !nextTabs.some((tab) => tab.id === activeTab.value)) {
      activeTab.value = 'overview';
    }
  },
  { immediate: true },
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

const associationsSspId = computed(() => {
  if (context.value?.scope === 'ssp') {
    return context.value.id;
  }
  return systemStore.system.securityPlan?.uuid || '';
});

const associationBaseEndpoint = computed(() => {
  if (!associationsSspId.value || !resolvedRiskId.value) return null;
  return `/api/oscal/system-security-plans/${associationsSspId.value}/risks/${resolvedRiskId.value}`;
});

const normalizedRiskStatus = computed(() =>
  normalizeRiskRegisterStatus(risk.value?.status),
);

const riskStatusDisplay = computed(() => riskStatusLabel(risk.value?.status));

const overviewReviewDeadline = computed(() =>
  risk.value ? getRiskReviewDeadline(risk.value) : undefined,
);

const overviewLastReviewedAt = computed(() =>
  readRiskString(['lastReviewedAt', 'lastReviewed']),
);

const overviewAcceptanceJustification = computed(() =>
  readRiskString(['acceptanceJustification']),
);

const overviewFirstSeenAt = computed(() =>
  readRiskString(['firstSeenAt', 'firstObservedAt']),
);

const overviewLastSeenAt = computed(() =>
  readRiskString(['lastSeenAt', 'lastObservedAt']),
);

const sourceTypeDisplay = computed(() =>
  formatTokenLabel(readRiskString(['sourceType']) || 'manual'),
);

const riskLikelihoodValue = computed(() =>
  risk.value ? getRiskLikelihood(risk.value) : '',
);

const riskImpactValue = computed(() =>
  risk.value ? getRiskImpact(risk.value) : '',
);

const overviewLikelihood = computed(() =>
  formatTokenLabel(riskLikelihoodValue.value || 'N/A'),
);

const overviewImpact = computed(() =>
  formatTokenLabel(riskImpactValue.value || 'N/A'),
);

const threatItems = computed<ThreatTabItem[]>(() => {
  const rawThreats = Array.isArray(risk.value?.threatIds)
    ? (risk.value?.threatIds as unknown[])
    : [];
  return rawThreats
    .map((entry) => {
      if (typeof entry === 'string') {
        return {
          id: entry.trim(),
          system: 'N/A',
          title: '',
          url: '',
          safeUrl: '',
        };
      }

      const record = toRecord(entry);
      if (!record) {
        return {
          id: '',
          system: 'N/A',
          title: '',
          url: '',
          safeUrl: '',
        };
      }

      const url = readString(record, ['url', 'href']) || '';
      return {
        threatRefId: readString(record, ['threatRefId']),
        id: readString(record, ['refId', 'id']) || '',
        system: readString(record, ['system']) || 'N/A',
        title: readString(record, ['title']) || '',
        url,
        safeUrl: sanitizeExternalHref(url),
      };
    })
    .filter((item) => !!item.id);
});

const remediationItems = computed<RemediationTabItem[]>(() => {
  const remediationTemplate = remediationTemplateResource.value;

  if (remediationTemplate) {
    return [normalizeRemediationItem(remediationTemplate)];
  }

  const legacyRemediations = Array.isArray(
    (risk.value as Risk | null)?.remediations,
  )
    ? ((risk.value as Risk & { remediations?: unknown[] }).remediations ?? [])
    : [];
  return legacyRemediations
    .map((entry) => {
      const record = toRecord(entry);
      return record ? normalizeRemediationItem(record) : null;
    })
    .filter((item): item is RemediationTabItem => item !== null);
});

const workflowStage = computed(() => riskWorkflowStage(risk.value?.status));

const workflowStageSummary = computed(() =>
  riskWorkflowStageSummary(workflowStage.value),
);

const workflowHints = computed(() => riskWorkflowHints(risk.value?.status));

const workflowNextTransitions = computed(() =>
  getAllowedRiskTransitions(risk.value?.status),
);

const workflowNextTransitionsSummary = computed(() =>
  workflowNextTransitions.value.length
    ? workflowNextTransitions.value
        .map((status) => riskStatusLabel(status))
        .join(', ')
    : 'No direct status transitions available.',
);

const workflowTransitionRows = computed(() =>
  (
    Object.entries(ALLOWED_RISK_TRANSITIONS) as Array<
      [keyof typeof ALLOWED_RISK_TRANSITIONS, string[]]
    >
  ).map(([status, next]) => ({
    status,
    next,
  })),
);

const canAcceptAction = computed(
  () => isSspContext.value && canAcceptRisk(risk.value?.status),
);

const canReviewAction = computed(
  () => isSspContext.value && canReviewRisk(risk.value?.status),
);

const showAcceptedReviewFields = computed(
  () => normalizedRiskStatus.value === 'risk-accepted',
);

const showAcceptanceJustificationBox = computed(
  () => showAcceptedReviewFields.value,
);

const canReviewScoreAction = computed(
  () => isSspContext.value && canReassessRisk(risk.value?.status),
);

const canStartInvestigationAction = computed(
  () => isSspContext.value && normalizedRiskStatus.value === 'open',
);

const canCloseAction = computed(
  () => isSspContext.value && workflowNextTransitions.value.includes('closed'),
);

// BCH-1186: Promote to POAM — only available when status is `investigating`.
const canPromoteToPoamAction = computed(
  () => isSspContext.value && canPromoteToPoam(risk.value?.status),
);

// BCH-1186: Mark Mitigating Implemented — only available when status is `mitigating-planned`.
const canMarkMitigatingImplementedAction = computed(
  () => isSspContext.value && canMarkMitigatingImplemented(risk.value?.status),
);

const linkedPoamItems = computed<PoamItem[]>(() =>
  normalizeLinkedPoamItems(fetchedLinkedPoamItems.value),
);

const hasLinkedPoamItems = computed(() => linkedPoamItems.value.length > 0);

const canCreateMitigationAction = computed(
  () =>
    canPromoteToPoamAction.value &&
    !loadingLinkedPoamItems.value &&
    !hasLinkedPoamItems.value,
);

const canMitigateRiskAction = computed(
  () =>
    canPromoteToPoamAction.value &&
    !loadingLinkedPoamItems.value &&
    hasLinkedPoamItems.value,
);

const canReopenRiskAction = computed(
  () => isSspContext.value && canReopenRisk(risk.value?.status),
);

const ownerAssignmentsDirty = computed(
  () =>
    ownerAssignmentsSignature(ownerAssignmentsDraft.value) !==
    ownerAssignmentsSnapshotSignature.value,
);

const loadedComponentsSspId = ref('');
const loadedControlsSspId = ref('');
const evidenceOptionsLoaded = ref(false);
const evidenceDetailCache = new Map<string, AssociationPickerOption>();
const componentDetailCache = new Map<string, AssociationPickerOption>();

watch(associationsSspId, (next, prev) => {
  if (next === prev) return;

  loadedComponentsSspId.value = '';
  loadedControlsSspId.value = '';
  evidenceOptionsLoaded.value = false;
  availableComponents.value = undefined;
  availableEvidence.value = undefined;
  availableControlsWithCatalog.value = undefined;
  evidenceDetailCache.clear();
  componentDetailCache.clear();
});

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readString(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function normalizeRemediationTasks(
  rawTasks: unknown,
): RemediationTabItem['tasks'] {
  if (!Array.isArray(rawTasks)) return [];

  const tasks: RemediationTabItem['tasks'] = [];

  rawTasks.forEach((task) => {
    const record = toRecord(task);
    if (!record) return;
    const title = readString(record, ['title']) || '';
    if (!title) return;
    tasks.push({
      id: readString(record, ['id', 'uuid']),
      title,
      orderIndex: readNumber(record, ['orderIndex']),
    });
  });

  return tasks.sort(
    (left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
  );
}

function normalizeRemediationItem(
  record: Record<string, unknown>,
): RemediationTabItem {
  const title = readString(record, ['title']) || '';

  return {
    id: readString(record, ['id', 'uuid']),
    title,
    description: readString(record, ['description']) || '',
    remarks: readString(record, ['remarks']),
    lifecycle: readString(record, ['lifecycle']),
    tasks: normalizeRemediationTasks(record.tasks),
  };
}

function setAssociations(
  kind: RiskAssociationKind,
  items: AssociationPickerOption[],
) {
  if (kind === 'evidence') {
    evidenceAssociations.value = items;
    return;
  }
  if (kind === 'controls') {
    controlAssociations.value = items;
    return;
  }
  componentAssociations.value = items;
}

function getAssociations(kind: RiskAssociationKind): AssociationPickerOption[] {
  if (kind === 'evidence') return evidenceAssociations.value;
  if (kind === 'controls') return controlAssociations.value;
  return componentAssociations.value;
}

function syncAssociationsFromRisk() {
  evidenceAssociations.value = getRiskAssociations(risk.value, 'evidence').map(
    (item) => ({ ...item }),
  );
  controlAssociations.value = getRiskAssociations(risk.value, 'controls').map(
    (item) => ({ ...item }),
  );
  componentAssociations.value = getRiskAssociations(
    risk.value,
    'components',
  ).map((item) => ({ ...item }));
}

function readRiskString(keys: string[]): string | undefined {
  const source = toRecord(risk.value);
  if (!source) return undefined;
  return readString(source, keys);
}

function formatTokenLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function sanitizeExternalHref(value?: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URLs and render as plain text.
  }
  return '';
}

function ownerAssignmentsFromRisk(
  currentRisk: Risk | null,
): RiskOwnerAssignmentsPayload {
  const source = toRecord(currentRisk) || {};
  const primaryOwnerUserId = readString(source, ['primaryOwnerUserId']);
  const rawAssignments = Array.isArray(source.ownerAssignments)
    ? source.ownerAssignments
    : [];

  const ownerAssignments = rawAssignments
    .map((entry) => {
      const assignment = toRecord(entry);
      if (!assignment) return null;
      const ownerKind = readString(assignment, ['ownerKind']) || '';
      const ownerRef = readString(assignment, ['ownerRef']) || '';
      const isPrimary = Boolean(assignment.isPrimary);
      if (ownerKind !== 'user' || !ownerRef) return null;
      return {
        ownerKind: 'user' as const,
        ownerRef,
        isPrimary,
      };
    })
    .filter(
      (
        assignment,
      ): assignment is RiskOwnerAssignmentsPayload['ownerAssignments'][number] =>
        !!assignment,
    );

  return normalizeOwnerAssignments({
    primaryOwnerUserId,
    ownerAssignments,
  });
}

function syncOwnerAssignmentsFromRisk() {
  const normalized = ownerAssignmentsFromRisk(risk.value);
  ownerAssignmentsDraft.value = cloneDeep(normalized);
  ownerAssignmentsSnapshot.value = cloneDeep(normalized);
  ownerAssignmentsSnapshotSignature.value =
    ownerAssignmentsSignature(normalized);
  ownerAssignmentsResetKey.value += 1;
  ownerSaveError.value = '';
}

function onOverviewOwnerAssignmentsChange(
  payload: RiskOwnerAssignmentsPayload,
) {
  ownerAssignmentsDraft.value = normalizeOwnerAssignments(payload);
  ownerSaveError.value = '';
}

function applyRiskUpdate(updated: Risk | undefined) {
  if (!updated) return;
  risk.value = cloneDeep(updated);
  syncOwnerAssignmentsFromRisk();
  notifyRiskUpdated(risk.value);
}

async function refreshRiskDetail(notifyError = true): Promise<boolean> {
  if (!detailEndpoint.value) return false;

  try {
    await executeFetchRisk(detailEndpoint.value);
    applyRiskUpdate(fetchedRisk.value);
    return Boolean(fetchedRisk.value);
  } catch (err) {
    if (isCanceledError(err)) return false;
    if (notifyError) {
      toast.add({
        severity: 'error',
        summary: 'Refresh failed',
        detail: extractErrorMessage(err),
        life: 4000,
      });
    }
    return false;
  }
}

function buildRiskPutPayload(
  overrides: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!risk.value) return null;
  return {
    ...(cloneDeep(risk.value) as Record<string, unknown>),
    ...overrides,
  };
}

async function saveOwnerAssignments(
  payload: RiskOwnerAssignmentsPayload,
  options: { showSuccessToast?: boolean } = {},
): Promise<boolean> {
  if (!isSspContext.value || !detailEndpoint.value) {
    return false;
  }

  const normalized = normalizeOwnerAssignments(payload);
  if (!normalized.primaryOwnerUserId) {
    const detail = 'Primary owner is required before saving owner assignments.';
    ownerSaveError.value = detail;
    toast.add({
      severity: 'error',
      summary: 'Owner update failed',
      detail,
      life: 4000,
    });
    return false;
  }
  const updatePayload = buildRiskPutPayload({
    primaryOwnerUserId: normalized.primaryOwnerUserId,
    ownerAssignments: normalized.ownerAssignments,
  });
  if (!updatePayload) {
    ownerSaveError.value =
      'Unable to update owners: risk details are unavailable.';
    return false;
  }
  ownerSaveError.value = '';

  try {
    await executeRiskMutation(detailEndpoint.value, {
      method: 'PUT',
      data: updatePayload,
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    if (options.showSuccessToast !== false) {
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Owner assignments updated',
        life: 3000,
      });
    }
    return true;
  } catch (err) {
    const detail = extractErrorMessage(err);
    ownerSaveError.value = detail;
    toast.add({
      severity: 'error',
      summary: 'Owner update failed',
      detail,
      life: 4000,
    });
    return false;
  }
}

async function saveOverviewOwnerAssignments() {
  if (!ownerAssignmentsDirty.value) {
    ownerAssignmentsResetKey.value += 1;
    return;
  }
  await saveOwnerAssignments(ownerAssignmentsDraft.value);
}

async function updateRiskStatus(
  status:
    | 'investigating'
    | 'mitigating-planned'
    | 'mitigating-implemented'
    | 'closed',
  summary: string,
  detail: string,
) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  const updatePayload = buildRiskPutPayload({ status });
  if (!updatePayload) {
    toast.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: 'Unable to update status: risk details are unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeRiskMutation(detailEndpoint.value, {
      method: 'PUT',
      data: updatePayload,
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
    void loadRiskScoreHistory();
    toast.add({
      severity: 'success',
      summary,
      detail,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function startInvestigation() {
  await updateRiskStatus(
    'investigating',
    'Investigation started',
    'Risk status updated to Investigating.',
  );
}

async function closeRisk() {
  await updateRiskStatus(
    'closed',
    'Risk closed',
    'Risk status updated to Closed.',
  );
}

function isRiskScoreLevel(value: string): value is RiskScoreLevel {
  return (
    value === 'low' ||
    value === 'moderate' ||
    value === 'high' ||
    value === 'critical'
  );
}

async function submitRiskScoreReview(payload: RiskScoreReviewSubmitPayload) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  const likelihood = payload.likelihood;
  const impact = payload.impact;
  const notes = payload.notes?.trim();

  if (!isRiskScoreLevel(likelihood) || !isRiskScoreLevel(impact)) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Likelihood and impact are required.',
      life: 3500,
    });
    return;
  }

  try {
    await executeRiskMutation(`${detailEndpoint.value}/review`, {
      method: 'POST',
      data: {
        decision: payload.decision,
        likelihood,
        impact,
        notes: notes || undefined,
      },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    showScoreReviewModal.value = false;
    await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
    void loadRiskScoreHistory();

    toast.add({
      severity: 'success',
      summary: 'Risk score reviewed',
      detail: 'Likelihood and impact review has been recorded.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Review failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function submitAcceptRisk(payload: RiskAcceptSubmitPayload) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  try {
    if (payload.ownerUpdate) {
      const ownerSaved = await saveOwnerAssignments(payload.ownerUpdate, {
        showSuccessToast: false,
      });
      if (!ownerSaved) {
        return;
      }
    }

    await executeRiskMutation(`${detailEndpoint.value}/accept`, {
      method: 'POST',
      data: {
        justification: payload.justification,
        reviewDeadline: payload.reviewDeadline,
      },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    showAcceptModal.value = false;
    await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
    void loadRiskScoreHistory();

    toast.add({
      severity: 'success',
      summary: 'Risk accepted',
      detail: 'Risk acceptance has been recorded.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Accept failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function submitReviewRisk(payload: RiskReviewSubmitPayload) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  if (payload.decision === 'extend' && !payload.nextReviewDeadline) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Next review deadline is required when decision is extend.',
      life: 3500,
    });
    return;
  }

  if (payload.decision === 'reopen' && payload.nextReviewDeadline) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Next review deadline must be empty when decision is reopen.',
      life: 3500,
    });
    return;
  }

  try {
    await executeRiskMutation(`${detailEndpoint.value}/review`, {
      method: 'POST',
      data: {
        decision: payload.decision,
        notes: payload.notes,
        nextReviewDeadline: payload.nextReviewDeadline,
      },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    showReviewModal.value = false;
    await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
    void loadRiskScoreHistory();

    toast.add({
      severity: 'success',
      summary: 'Review recorded',
      detail: 'Risk review has been saved.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Review failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

// ─── BCH-1186: Promote to POAM ───────────────────────────────────────────────

const { promoteRiskToPoam, isLoading: promotingToPoam } =
  usePromoteRiskToPoam();

function normalizeLinkedPoamItems(payload: unknown): PoamItem[] {
  if (Array.isArray(payload)) {
    return payload as PoamItem[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: PoamItem[] }).data;
  }

  return [];
}

function resolveMitigationStatus(items: PoamItem[]) {
  return items.every((item) => item.status === 'completed')
    ? 'mitigating-implemented'
    : 'mitigating-planned';
}

async function submitPromoteToPoam(payload: {
  title?: string;
  deadline?: string;
  resourceRequired?: string;
}) {
  const riskIdentifier = getRiskIdentifier(risk.value);
  if (!isSspContext.value || !riskIdentifier || !context.value) return;
  try {
    await promoteRiskToPoam(context.value.id, riskIdentifier, {
      title: payload.title || undefined,
      description: undefined,
      deadline: payload.deadline || undefined,
      resourceRequired: payload.resourceRequired || undefined,
    });
    showPromoteToPoamModal.value = false;
    // Reload the risk so the status badge updates to `mitigating-planned`.
    await loadRisk();
    toast.add({
      severity: 'success',
      summary: 'Mitigation Created',
      detail:
        'Risk mitigation has been created and status is now Mitigating Planned.',
      life: 4000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Mitigation action failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function reopenRisk() {
  await updateRiskStatus(
    'investigating',
    'Risk reopened',
    'Risk status updated to Investigating.',
  );
}

async function mitigateRisk() {
  if (!hasLinkedPoamItems.value) return;

  const nextStatus = resolveMitigationStatus(linkedPoamItems.value);
  await updateRiskStatus(
    nextStatus,
    'Mitigation linked',
    `Existing mitigation plan found. Risk status updated to ${riskStatusLabel(nextStatus)}.`,
  );
}

async function submitMarkMitigatingImplemented() {
  if (!isSspContext.value || !detailEndpoint.value) return;

  try {
    await executeRiskMutation(`${detailEndpoint.value}/review`, {
      method: 'POST',
      data: { decision: 'implement' },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    await Promise.all([loadRiskEvents(1), loadRiskReviews(1)]);
    void loadRiskScoreHistory();
    toast.add({
      severity: 'success',
      summary: 'Mitigation implemented',
      detail: 'Risk has been marked as Mitigating Implemented.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Transition failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

function resetThreatEditor() {
  threatEditingKey.value = null;
  workingThreat.value = {
    id: '',
    system: '',
    title: '',
    url: '',
  };
}

function openThreatCreate() {
  resetThreatEditor();
  showThreatEditor.value = true;
}

function openThreatEdit(threat: ThreatTabItem) {
  if (!threat.threatRefId) {
    toast.add({
      severity: 'warn',
      summary: 'Edit unavailable',
      detail: 'Legacy threats without a threat reference cannot be edited.',
      life: 3500,
    });
    return;
  }

  threatEditingKey.value = threat.threatRefId || null;
  workingThreat.value = {
    id: threat.id,
    system: threat.system,
    title: threat.title,
    url: threat.url,
    threatRefId: threat.threatRefId,
  };
  showThreatEditor.value = true;
}

function closeThreatEditor() {
  showThreatEditor.value = false;
  resetThreatEditor();
}

function buildThreatPayload() {
  const id = workingThreat.value.id.trim();
  const system = workingThreat.value.system.trim();
  const title = workingThreat.value.title.trim();
  const url = workingThreat.value.url.trim();

  if (!id || !system || !title) {
    return null;
  }

  return url
    ? {
        id,
        system,
        title,
        url,
      }
    : {
        id,
        system,
        title,
      };
}

function buildThreatItemEndpointForMutation(threatRefId?: string | null) {
  if (!context.value || !resolvedRiskId.value || !threatRefId) return null;
  return buildRiskThreatItemEndpoint(
    context.value,
    resolvedRiskId.value,
    threatRefId,
  );
}

async function saveThreat() {
  const isEditing = Boolean(threatEditingKey.value);
  const payload = buildThreatPayload();
  if (!payload) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Threat id, system, and title are required.',
      life: 3000,
    });
    return;
  }

  const endpoint = isEditing
    ? buildThreatItemEndpointForMutation(workingThreat.value.threatRefId)
    : threatCollectionEndpoint.value;
  const method = isEditing ? 'PUT' : 'POST';

  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: 'Threat endpoint is unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method,
      data: payload,
    });
    const refreshed = await refreshRiskDetail(false);
    if (!refreshed) {
      toast.add({
        severity: 'warn',
        summary: 'Saved, refresh failed',
        detail:
          'Threat was saved, but the latest risk details could not be reloaded.',
        life: 4000,
      });
      return;
    }
    closeThreatEditor();
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: isEditing ? 'Threat updated' : 'Threat added',
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function removeThreat(threat: ThreatTabItem) {
  if (!threat.threatRefId) {
    toast.add({
      severity: 'warn',
      summary: 'Remove unavailable',
      detail: 'Legacy threats without a threat reference cannot be removed.',
      life: 3500,
    });
    return;
  }

  const confirmed = window.confirm(
    `Remove threat "${threat.id}" from this risk?`,
  );
  if (!confirmed) return;

  const endpoint = buildThreatItemEndpointForMutation(threat.threatRefId);
  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: 'Threat endpoint is unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'DELETE',
    });
    await refreshRiskDetail();
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Threat removed',
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

function resetRemediationEditor() {
  remediationEditingId.value = null;
  workingRemediation.value = {
    title: '',
    description: '',
    tasks: [],
  };
}

function openRemediationCreate() {
  resetRemediationEditor();
  showRemediationEditor.value = true;
}

function openPrimaryRemediationEditor() {
  if (hasRemediationTemplateResource.value && remediationItems.value.length) {
    openRemediationEdit(remediationItems.value[0]);
    return;
  }

  openRemediationCreate();
}

function openRemediationEdit(remediation: RemediationTabItem) {
  if (!hasRemediationTemplateResource.value) {
    toast.add({
      severity: 'warn',
      summary: 'Edit unavailable',
      detail:
        'Legacy remediations cannot be edited until a remediation template exists.',
      life: 3500,
    });
    return;
  }

  remediationEditingId.value = remediation.id || 'existing-template';
  workingRemediation.value = {
    id: remediation.id,
    title: remediation.title || '',
    description: remediation.description || '',
    tasks: (remediation.tasks || [])
      .map((task) => task.title?.trim() || '')
      .filter(Boolean),
  };
  showRemediationEditor.value = true;
}

function closeRemediationEditor() {
  showRemediationEditor.value = false;
  resetRemediationEditor();
}

function buildRemediationPayload() {
  const title = workingRemediation.value.title.trim();
  const description = workingRemediation.value.description.trim();

  if (!title) {
    return null;
  }

  const tasks = workingRemediation.value.tasks
    .map((task) => task.trim())
    .filter(Boolean)
    .map((title, index) => ({
      title,
      orderIndex: index + 1,
    }));

  return {
    title,
    description: description || undefined,
    tasks: tasks.length ? tasks : undefined,
  };
}

function remediationItemEndpoint() {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskRemediationItemEndpoint(context.value, resolvedRiskId.value);
}

async function saveRemediation() {
  const hasExistingTemplate = hasRemediationTemplateResource.value;
  const payload = buildRemediationPayload();
  if (!payload) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title is required.',
      life: 3000,
    });
    return;
  }

  const endpoint = hasExistingTemplate
    ? remediationItemEndpoint()
    : remediationCollectionEndpoint.value;
  const method = hasExistingTemplate ? 'PUT' : 'POST';

  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: 'Remediation endpoint is unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method,
      data: payload,
    });
    const refreshed = await refreshRiskDetail(false);
    if (!refreshed) {
      toast.add({
        severity: 'warn',
        summary: 'Saved, refresh failed',
        detail:
          'Remediation was saved, but the latest risk details could not be reloaded.',
        life: 4000,
      });
      return;
    }
    closeRemediationEditor();
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: hasExistingTemplate ? 'Remediation updated' : 'Remediation added',
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function removeRemediation(remediation: RemediationTabItem) {
  if (!hasRemediationTemplateResource.value) {
    toast.add({
      severity: 'warn',
      summary: 'Remove unavailable',
      detail:
        'Legacy remediations cannot be removed until a remediation template exists.',
      life: 3500,
    });
    return;
  }

  const confirmed = window.confirm(
    `Remove remediation "${remediation.title || 'Untitled remediation'}" from this risk?`,
  );
  if (!confirmed) return;

  const endpoint = remediationItemEndpoint();
  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: 'Remediation endpoint is unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'DELETE',
    });
    await refreshRiskDetail();
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Remediation removed',
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

function associationCollectionEndpoint(kind: RiskAssociationKind) {
  if (!associationBaseEndpoint.value) return null;
  return `${associationBaseEndpoint.value}/${kind}`;
}

function controlCompositeKey(catalogId?: string, controlId?: string) {
  if (!catalogId || !controlId) return '';
  return `${catalogId}:${controlId}`;
}

async function ensureEvidenceOptions() {
  if (evidenceOptionsLoaded.value) return;
  const payload = {
    filter: {
      scope: {},
    },
  };

  await executeLoadEvidence({
    data: payload,
  });
  evidenceOptionsLoaded.value = true;
}

async function ensureComponentOptions() {
  const sspId = associationsSspId.value;
  if (!sspId) return;

  if (loadedComponentsSspId.value === sspId) {
    return;
  }

  await executeLoadComponents(
    `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
  );
  loadedComponentsSspId.value = sspId;
}

async function ensureControlOptions() {
  const sspId = associationsSspId.value;
  if (!sspId) return;

  if (loadedControlsSspId.value !== sspId) {
    loadedControlsSspId.value = sspId;
    availableControlsWithCatalog.value = undefined;
  }

  if (availableControlsWithCatalog.value !== undefined) return;

  loadingProfileBindings.value = true;
  try {
    const { data: bindings } = await sspStore.listProfiles(sspId);
    const profileIds = bindings.map((binding) => binding.uuid);

    // An SSP can have several profiles attached; aggregate the resolved
    // controls of all of them so links against any attached profile resolve.
    const results = await Promise.allSettled(
      profileIds.map((bindingProfileId) =>
        authenticatedApi.get<DataResponse<ResolvedControlWithCatalog[]>>(
          `/api/oscal/profiles/${bindingProfileId}/resolved-with-catalogs`,
        ),
      ),
    );

    const merged: ResolvedControlWithCatalog[] = [];
    const seen = new Set<string>();
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      (result.value?.data?.data || []).forEach((item) => {
        if (!item?.controlId) return;
        const key =
          controlCompositeKey(item.catalogId, item.controlId) || item.controlId;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
      });
    });

    availableControlsWithCatalog.value = merged;
    return;
  } catch (err) {
    if (isCanceledError(err)) {
      throw err;
    }
  } finally {
    loadingProfileBindings.value = false;
  }

  availableControlsWithCatalog.value = [];
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
  (availableControlsWithCatalog.value || []).map((item) => ({
    id: item.controlId,
    title: item.title || item.controlId,
    controlId: item.controlId,
    catalogId: item.catalogId,
    catalogName: item.catalogId,
    subtitle: `${item.class || 'control'} • ${item.controlId}`,
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
    evidenceId: item.uuid || item.id,
    evidenceUuid: item.uuid,
    title: item.title || item.uuid || item.id,
    description: item.description,
    start: item.start,
    end: item.end,
    labels: normalizeEvidenceLabels(item.labels),
    subtitle: item.uuid || item.id,
  })),
);

const evidencePickerLookup = computed(() => {
  const map = new Map<string, AssociationPickerOption>();
  evidencePickerOptions.value.forEach((item) => {
    [item.evidenceId, item.evidenceUuid, item.id]
      .filter(Boolean)
      .forEach((key) => map.set(key as string, item));
  });
  return map;
});

const controlPickerLookup = computed(() => {
  const composite = new Map<string, AssociationPickerOption>();
  const plainControl = new Map<string, AssociationPickerOption>();

  controlPickerOptions.value.forEach((item) => {
    const controlId = item.controlId || item.id;
    const compositeKey = controlCompositeKey(item.catalogId, controlId);
    if (compositeKey) composite.set(compositeKey, item);
    if (controlId && !plainControl.has(controlId)) {
      plainControl.set(controlId, item);
    }
  });

  return {
    composite,
    plainControl,
  };
});

const componentPickerLookup = computed(() => {
  const map = new Map<string, AssociationPickerOption>();
  componentPickerOptions.value.forEach((item) => {
    if (item.id) {
      map.set(item.id, item);
    }
  });
  return map;
});

function normalizeIdLink(entry: unknown, keys: string[]): string | undefined {
  if (typeof entry === 'string' && entry.trim()) {
    return entry.trim();
  }

  const record = toRecord(entry);
  if (!record) return undefined;

  return readString(record, keys);
}

function parseEvidenceLinks(rows: unknown[]): RiskEvidenceLink[] {
  return rows
    .map((entry) => {
      const evidenceId = normalizeIdLink(entry, [
        'evidenceId',
        'evidenceUuid',
        'id',
        'uuid',
      ]);
      if (!evidenceId) return null;

      const record = toRecord(entry);
      return {
        riskId: record
          ? readString(record, ['riskId']) || resolvedRiskId.value
          : resolvedRiskId.value,
        evidenceId,
      };
    })
    .filter((item): item is RiskEvidenceLink => !!item);
}

function normalizeEvidenceLabels(input: unknown): EvidenceLabel[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      const record = toRecord(entry);
      if (!record) {
        return null;
      }
      const name = readString(record, ['name']);
      const value = readString(record, ['value']);
      if (!name || !value) {
        return null;
      }
      return { name, value };
    })
    .filter((label): label is EvidenceLabel => !!label);
}

function parseControlLinks(rows: unknown[]): RiskControlLink[] {
  return rows
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        return {
          riskId: resolvedRiskId.value,
          controlId: entry.trim(),
          catalogId: undefined,
        };
      }

      const record = toRecord(entry);
      if (!record) return null;

      const controlId = readString(record, ['controlId', 'id']);
      if (!controlId) return null;

      return {
        riskId: readString(record, ['riskId']) || resolvedRiskId.value,
        catalogId: readString(record, ['catalogId', 'catalogUuid', 'catalog']),
        controlId,
      };
    })
    .filter((item): item is RiskControlLink => !!item);
}

function parseComponentLinks(rows: unknown[]): RiskComponentLink[] {
  return rows
    .map((entry) => {
      const componentId = normalizeIdLink(entry, ['componentId', 'id', 'uuid']);
      if (!componentId) return null;

      const record = toRecord(entry);
      return {
        riskId: record
          ? readString(record, ['riskId']) || resolvedRiskId.value
          : resolvedRiskId.value,
        componentId,
      };
    })
    .filter((item): item is RiskComponentLink => !!item);
}

async function loadEvidenceAssociationOption(
  evidenceId: string,
): Promise<AssociationPickerOption> {
  const cached = evidenceDetailCache.get(evidenceId);
  if (cached) return cached;

  const pickerOption = evidencePickerLookup.value.get(evidenceId);
  let detail = pickerOption;

  try {
    const response = await authenticatedApi.get<DataResponse<Evidence>>(
      `/api/evidence/latest/${evidenceId}`,
    );
    const evidence = response?.data?.data;
    if (evidence) {
      detail = {
        id: evidence.id || evidence.uuid || evidenceId,
        evidenceId,
        evidenceUuid: evidence.uuid || evidenceId,
        title: evidence.title || evidence.uuid || evidence.id || evidenceId,
        description: evidence.description,
        start: evidence.start,
        end: evidence.end,
        labels: normalizeEvidenceLabels(evidence.labels),
        subtitle: evidence.uuid || evidence.id || evidenceId,
      };
    }
  } catch (err) {
    if (!isCanceledError(err)) {
      detail = pickerOption;
    }
  }

  const normalized: AssociationPickerOption = {
    ...(detail || {}),
    id: detail?.id || evidenceId,
    evidenceId,
    evidenceUuid: detail?.evidenceUuid || evidenceId,
    title: detail?.title || evidenceId,
    description: detail?.description,
    start: detail?.start,
    end: detail?.end,
    labels: normalizeEvidenceLabels(detail?.labels),
    subtitle: detail?.subtitle || evidenceId,
  };

  evidenceDetailCache.set(evidenceId, normalized);
  return normalized;
}

async function loadComponentAssociationOption(
  componentId: string,
): Promise<AssociationPickerOption> {
  const cached = componentDetailCache.get(componentId);
  if (cached) return cached;

  const pickerOption = componentPickerLookup.value.get(componentId);
  if (pickerOption) {
    componentDetailCache.set(componentId, pickerOption);
    return pickerOption;
  }

  const sspId = associationsSspId.value;
  if (!sspId) {
    return {
      id: componentId,
      title: componentId,
      subtitle: componentId,
    };
  }

  try {
    await executeLoadComponentDetail(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/components/${componentId}`,
    );
    const component = fetchedComponentDetail.value;
    if (component) {
      const normalized: AssociationPickerOption = {
        id: component.uuid || componentId,
        title: component.title || componentId,
        type: component.type,
        description: component.description,
        subtitle: `${component.type || 'component'} • ${component.uuid || componentId}`,
      };
      componentDetailCache.set(componentId, normalized);
      return normalized;
    }
  } catch (err) {
    if (isCanceledError(err)) {
      throw err;
    }
  }

  return {
    id: componentId,
    title: componentId,
    subtitle: componentId,
  };
}

async function refreshAssociationLinks(
  kind: RiskAssociationKind,
  notifyError = false,
) {
  const endpoint = associationCollectionEndpoint(kind);
  if (!endpoint) return;

  try {
    if (kind !== 'evidence') {
      await ensurePickerData(kind);
    }
    await executeFetchAssociationLinks(endpoint);
    const rows = Array.isArray(fetchedAssociationLinks.value)
      ? fetchedAssociationLinks.value
      : [];

    if (kind === 'evidence') {
      const links = parseEvidenceLinks(rows);

      const evidenceIds = Array.from(
        new Set(links.map((link) => link.evidenceId).filter(Boolean)),
      );
      const mapped = await Promise.all(
        evidenceIds.map((evidenceId) =>
          loadEvidenceAssociationOption(evidenceId),
        ),
      );

      setAssociations('evidence', mapped);
      return;
    }

    if (kind === 'controls') {
      const links = parseControlLinks(rows);

      const seen = new Set<string>();
      const mapped: AssociationPickerOption[] = [];

      links.forEach((link) => {
        const catalogId = link.catalogId;
        const controlId = link.controlId;

        const option =
          (catalogId
            ? controlPickerLookup.value.composite.get(
                controlCompositeKey(catalogId, controlId),
              )
            : undefined) ||
          controlPickerLookup.value.plainControl.get(controlId);
        const resolvedCatalogId = catalogId || option?.catalogId;
        const dedupeKey =
          controlCompositeKey(resolvedCatalogId, controlId) || controlId;
        if (!controlId || seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        mapped.push({
          ...(option || {}),
          id: controlId,
          controlId,
          catalogId: resolvedCatalogId,
          title: option?.title || controlId,
          catalogName: option?.catalogName || resolvedCatalogId || 'Catalog',
          description: option?.description,
          subtitle:
            option?.subtitle ||
            `${option?.catalogName || resolvedCatalogId || 'Catalog'} • ${controlId}`,
        });
      });

      setAssociations('controls', mapped);
      return;
    }

    const links = parseComponentLinks(rows);

    const seen = new Set<string>();
    const mapped: AssociationPickerOption[] = [];

    for (const link of links) {
      const componentId = link.componentId;
      if (!componentId || seen.has(componentId)) continue;
      seen.add(componentId);

      const option = await loadComponentAssociationOption(componentId);
      mapped.push({
        ...(option || {}),
        id: componentId,
        title: option?.title || componentId,
        type: option?.type,
        description: option?.description,
        subtitle: option?.subtitle || componentId,
      });
    }

    setAssociations('components', mapped);
  } catch (err) {
    if (isCanceledError(err)) return;
    if (notifyError) {
      toast.add({
        severity: 'error',
        summary: `Failed to load ${associationLabel(kind).toLowerCase()}`,
        detail: extractErrorMessage(err),
        life: 4000,
      });
    }
  }
}

async function refreshAllAssociationLinks() {
  for (const kind of ['evidence', 'controls', 'components'] as const) {
    await refreshAssociationLinks(kind);
  }
}

function buildAssociationCreatePayload(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  if (kind === 'evidence') {
    const evidenceId = item.evidenceId || item.evidenceUuid || item.id;
    return evidenceId ? { evidenceId } : null;
  }

  if (kind === 'controls') {
    const controlId = item.controlId || item.id;
    if (!item.catalogId || !controlId) return null;
    return {
      catalogId: item.catalogId,
      controlId,
    };
  }

  return item.id ? { componentId: item.id } : null;
}

function buildAssociationDeleteEndpoint(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  const base = associationCollectionEndpoint(kind);
  if (!base) return null;

  if (kind === 'evidence') {
    const evidenceId = item.evidenceId || item.evidenceUuid || item.id;
    return evidenceId ? `${base}/${encodeURIComponent(evidenceId)}` : null;
  }

  if (kind === 'controls') {
    const controlId = item.controlId || item.id;
    if (!item.catalogId || !controlId) return null;
    return `${base}/${encodeURIComponent(item.catalogId)}/${encodeURIComponent(controlId)}`;
  }

  return item.id ? `${base}/${encodeURIComponent(item.id)}` : null;
}

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
      return loadingProfileBindings.value;
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

function associationKeys(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
): string[] {
  const keys =
    kind === 'evidence'
      ? [item.evidenceUuid, item.evidenceId, item.id]
      : kind === 'controls'
        ? [
            controlCompositeKey(item.catalogId, item.controlId || item.id),
            item.controlId,
            item.id,
          ]
        : [item.id];

  return Array.from(new Set(keys.filter(Boolean) as string[]));
}

const linkedAssociationIds = computed(() => {
  const linked = new Set<string>();
  getAssociations(pickerKind.value).forEach((item) => {
    associationKeys(pickerKind.value, item).forEach((key) => linked.add(key));
  });
  return linked;
});

const filteredPickerOptions = computed(() => {
  const search = pickerSearch.value.trim().toLowerCase();

  return pickerOptions.value.filter((option) => {
    const optionKeys = associationKeys(pickerKind.value, option);
    if (optionKeys.some((key) => linkedAssociationIds.value.has(key))) {
      return false;
    }

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
  if (!risk.value) {
    return;
  }

  const current = getAssociations(pickerKind.value);
  const itemKeys = associationKeys(pickerKind.value, item);
  const hasDuplicate = current.some((entry) =>
    associationKeys(pickerKind.value, entry).some((key) =>
      itemKeys.includes(key),
    ),
  );
  if (hasDuplicate) {
    return;
  }

  const endpoint = associationCollectionEndpoint(pickerKind.value);
  const payload = buildAssociationCreatePayload(pickerKind.value, item);
  if (!endpoint || !payload) {
    toast.add({
      severity: 'error',
      summary: 'Link failed',
      detail: `Unable to resolve the ${associationLabel(pickerKind.value).toLowerCase()} link payload.`,
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'POST',
      data: payload,
    });
    await refreshAssociationLinks(pickerKind.value, true);
    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${associationLabel(pickerKind.value)} linked`,
      life: 3000,
    });
    showAssociationPicker.value = false;
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Link failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function unlinkAssociation(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  if (!risk.value) return;

  const confirmed = window.confirm(
    `Remove ${associationLabel(kind).toLowerCase()} "${item.title}" from this risk?`,
  );
  if (!confirmed) return;

  const endpoint = buildAssociationDeleteEndpoint(kind, item);
  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: `Unable to resolve the ${associationLabel(kind).toLowerCase()} delete endpoint.`,
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'DELETE',
    });
    await refreshAssociationLinks(kind, true);
    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${associationLabel(kind)} removed`,
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
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

function evidenceAssociationKey(
  item: AssociationPickerOption,
  index: number,
): string {
  const stableIdentifiers = [
    item.evidenceId,
    item.evidenceUuid,
    item.id,
    item.subtitle,
  ].filter(Boolean);
  if (stableIdentifiers.length) {
    return stableIdentifiers.join(':');
  }
  return `evidence-association:${index}`;
}

function evidenceLabelChips(item: AssociationPickerOption): string[] {
  if (!item.labels?.length) {
    return [];
  }
  return item.labels.map((label) => `${label.name}=${label.value}`);
}

// The design-system screen shows the risk's title and offers Back.

// Overview facts and the workflow table, for the design-system template.
const overviewFacts = computed(() => [
  { key: 'status', label: 'Status', value: riskStatusDisplay.value },
  ...(showAcceptedReviewFields.value
    ? [
        {
          key: 'deadline',
          label: 'Review deadline',
          value: formatDate(overviewReviewDeadline.value),
        },
        {
          key: 'reviewed',
          label: 'Last reviewed',
          value: formatDate(overviewLastReviewedAt.value),
        },
      ]
    : []),
  { key: 'source', label: 'Source', value: sourceTypeDisplay.value },
  {
    key: 'firstSeen',
    label: 'First seen',
    value: formatDate(overviewFirstSeenAt.value),
  },
  {
    key: 'lastSeen',
    label: 'Last seen',
    value: formatDate(overviewLastSeenAt.value),
  },
  { key: 'likelihood', label: 'Likelihood', value: overviewLikelihood.value },
  { key: 'impact', label: 'Impact', value: overviewImpact.value },
  ...(showAcceptanceJustificationBox.value
    ? [
        {
          key: 'justification',
          label: 'Acceptance justification',
          value: overviewAcceptanceJustification.value || '',
        },
      ]
    : []),
  {
    key: 'threats',
    label: 'Threat IDs',
    value: threatItems.value
      .map((item) => item.id)
      .filter(Boolean)
      .join(', '),
  },
]);
const transitionFacts = computed(() =>
  workflowTransitionRows.value.map((row) => ({
    key: row.status,
    label:
      riskStatusLabel(row.status) +
      (row.status === normalizedRiskStatus.value ? ' (now)' : ''),
    value: row.next.length
      ? row.next.map((item) => riskStatusLabel(item)).join(', ')
      : 'No direct status transitions',
  })),
);
</script>

<template>
  <Stack gap="6">
    <PageHeader
      :title="risk?.title || 'Risk'"
      :description="risk?.description || undefined"
    >
      <template v-if="risk" #status
        ><Tag :label="riskStatusDisplay"
      /></template>
      <template #actions>
        <Button icon="back" @click="goBackToPreviousPage">Back</Button>
      </template>
    </PageHeader>
    <InlineMessage
      v-if="contextMissing"
      tone="error"
      :title="missingContextTitle"
      ><p>{{ missingContextDetail }}</p></InlineMessage
    >
    <DataState
      v-else-if="loading || loadError || notFound || !risk"
      :status="loading ? 'loading' : notFound ? 'empty' : 'error'"
      subject="this risk"
      empty-title="Risk not found"
      empty-body="The requested risk could not be located."
      skeleton="panel"
      @retry="loadRisk"
    />
    <Stack v-else gap="5">
      <Text v-if="risk.statement"
        ><strong>Statement:</strong> {{ risk.statement }}</Text
      >
      <Tabs label="Risk" :tabs="routeTabs">
        <Stack v-if="activeTab === 'overview'" gap="5">
          <Panel v-if="isSspContext" title="Lifecycle" :level="2">
            <Cluster gap="2">
              <Button
                v-if="canStartInvestigationAction"
                :loading="workflowSubmitting"
                @click="startInvestigation"
                >Start investigation</Button
              >
              <Button
                v-if="canCloseAction"
                :loading="workflowSubmitting"
                @click="closeRisk"
                >Close risk</Button
              >
              <Button
                v-if="canAcceptAction"
                :loading="workflowSubmitting"
                @click="showAcceptModal = true"
                >Accept risk</Button
              >
              <Button
                v-if="canReviewAction"
                :loading="workflowSubmitting"
                @click="showReviewModal = true"
                >Review risk</Button
              >
              <Button
                v-if="canReviewScoreAction"
                :loading="workflowSubmitting"
                @click="showScoreReviewModal = true"
                >Review risk score</Button
              >
              <Button
                v-if="canReopenRiskAction"
                :loading="workflowSubmitting"
                @click="reopenRisk"
                >Reopen</Button
              >
              <Button
                v-if="canCreateMitigationAction"
                :loading="workflowSubmitting || promotingToPoam"
                @click="showPromoteToPoamModal = true"
                >Create mitigation</Button
              >
              <Button
                v-if="canMitigateRiskAction"
                :loading="workflowSubmitting"
                @click="mitigateRisk"
                >Mitigate risk</Button
              >
              <Button
                v-if="canMarkMitigatingImplementedAction"
                :loading="workflowSubmitting"
                @click="submitMarkMitigatingImplemented"
                >Mark mitigation implemented</Button
              >
            </Cluster>
          </Panel>
          <RiskOwnerAssignment
            v-if="isSspContext"
            :initial-value="ownerAssignmentsDraft"
            :reset-key="ownerAssignmentsResetKey"
            :disabled="workflowSubmitting"
            mode="overview"
            @change="onOverviewOwnerAssignmentsChange"
            @save="saveOverviewOwnerAssignments"
          />
          <InlineMessage
            v-if="ownerSaveError"
            tone="error"
            title="Owners not saved"
            ><p>{{ ownerSaveError }}</p></InlineMessage
          >
          <DescriptionList :items="overviewFacts" />
          <RiskScoreHistoryWidget
            :snapshots="riskScoreHistory"
            :loading="loadingScoreHistory"
            :error="scoreHistoryLoadError"
          />
          <Panel title="Workflow state" :level="2">
            <Stack gap="3">
              <Text
                ><strong>{{ workflowStageSummary.title }}:</strong>
                {{ workflowStageSummary.description }}</Text
              >
              <Text
                >Allowed next transitions:
                {{ workflowNextTransitionsSummary }}</Text
              >
              <Stack v-if="workflowHints.length" gap="1" as="ul">
                <li v-for="hint in workflowHints" :key="hint">
                  <Text as="span">{{ hint }}</Text>
                </li>
              </Stack>
              <DescriptionList :items="transitionFacts" layout="stacked" />
              <Text variant="caption"
                >Review outcomes for an accepted risk: Extend keeps it accepted
                with a new review deadline; Reopen moves it back to
                Investigating.</Text
              >
            </Stack>
          </Panel>
          <Panel v-if="risk.remarks" title="Remarks" :level="2">
            <Text preserve-whitespace>{{ risk.remarks }}</Text>
          </Panel>
          <Panel
            v-if="risk.relatedObservations?.length"
            title="Related observations"
            :level="2"
          >
            <Stack gap="1" as="ul">
              <li
                v-for="obs in risk.relatedObservations"
                :key="obs.observationUuid"
              >
                <Text as="code" variant="code">{{ obs.observationUuid }}</Text>
              </li>
            </Stack>
          </Panel>
        </Stack>

        <Stack v-else-if="activeTab === 'evidence'" gap="4">
          <div>
            <Button
              icon="add"
              :loading="saving"
              @click="openAssociationPicker('evidence')"
              >Link evidence</Button
            >
          </div>
          <Text v-if="!evidenceAssociations.length" variant="caption"
            >No evidence is linked to this risk.</Text
          >
          <Stack v-else gap="3" as="ul">
            <li
              v-for="(item, associationIndex) in evidenceAssociations"
              :key="evidenceAssociationKey(item, associationIndex)"
            >
              <Panel :title="item.title || 'Untitled evidence'" :level="3">
                <template #actions>
                  <Button
                    v-if="item.evidenceId || item.evidenceUuid || item.id"
                    :to="{
                      name: 'evidence:history',
                      params: {
                        uuid: item.evidenceId || item.evidenceUuid || item.id,
                      },
                    }"
                    >Open</Button
                  >
                  <Button
                    :loading="saving"
                    @click="unlinkAssociation('evidence', item)"
                    >Unlink</Button
                  >
                </template>
                <Stack gap="2">
                  <Text>{{ item.description || 'No description.' }}</Text>
                  <Text variant="caption"
                    >{{ formatDate(item.start)
                    }}<template v-if="item.end">
                      to {{ formatDate(item.end) }}</template
                    ></Text
                  >
                  <Cluster v-if="item.labels?.length" gap="1">
                    <Tag
                      v-for="(label, labelIndex) in evidenceLabelChips(item)"
                      :key="`${evidenceAssociationKey(item, associationIndex)}:label:${labelIndex}`"
                      :label="label"
                    />
                  </Cluster>
                </Stack>
              </Panel>
            </li>
          </Stack>
        </Stack>

        <Stack v-else-if="activeTab === 'controls'" gap="4">
          <div>
            <Button
              icon="add"
              :loading="saving"
              @click="openAssociationPicker('controls')"
              >Link control</Button
            >
          </div>
          <Text v-if="!controlAssociations.length" variant="caption"
            >No controls are linked to this risk.</Text
          >
          <Stack v-else gap="3" as="ul">
            <li
              v-for="item in controlAssociations"
              :key="`${item.catalogId || 'default'}:${item.controlId || item.id}`"
            >
              <Panel
                :title="
                  `${item.controlId || item.id} ${item.title ?? ''}`.trim()
                "
                :level="3"
              >
                <template #actions>
                  <Button :to="controlRoute(item)">Open</Button>
                  <Button
                    :loading="saving"
                    @click="unlinkAssociation('controls', item)"
                    >Unlink</Button
                  >
                </template>
                <Stack gap="1">
                  <Text variant="caption"
                    >Catalog: {{ item.catalogName || 'Not known' }}</Text
                  >
                  <Text v-if="item.description">{{ item.description }}</Text>
                </Stack>
              </Panel>
            </li>
          </Stack>
        </Stack>

        <Stack v-else-if="activeTab === 'components'" gap="4">
          <div>
            <Button
              icon="add"
              :loading="saving"
              @click="openAssociationPicker('components')"
              >Link component</Button
            >
          </div>
          <Text v-if="!componentAssociations.length" variant="caption"
            >No components are linked to this risk.</Text
          >
          <Stack v-else gap="3" as="ul">
            <li v-for="item in componentAssociations" :key="item.id">
              <Panel :title="item.title || 'Untitled component'" :level="3">
                <template #actions>
                  <Button :to="componentRoute(item)">Open</Button>
                  <Button
                    :loading="saving"
                    @click="unlinkAssociation('components', item)"
                    >Unlink</Button
                  >
                </template>
                <Stack gap="1">
                  <Text variant="caption"
                    >Type: {{ item.type || 'Not set' }}</Text
                  >
                  <Text>{{ item.description || 'No description.' }}</Text>
                </Stack>
              </Panel>
            </li>
          </Stack>
        </Stack>

        <Stack v-else-if="activeTab === 'threats'" gap="4">
          <div>
            <Button icon="add" :loading="saving" @click="openThreatCreate"
              >Add threat</Button
            >
          </div>
          <Text v-if="!threatItems.length" variant="caption"
            >No threat identifiers have been recorded for this risk.</Text
          >
          <Stack v-else gap="3" as="ul">
            <li
              v-for="(threat, threatIndex) in threatItems"
              :key="
                threat.threatRefId ||
                `${threat.system}:${threat.id}:${threatIndex}`
              "
            >
              <Panel :title="threat.id || 'Threat'" :level="3">
                <template #actions>
                  <Button
                    :disabled-reason="
                      threat.threatRefId
                        ? undefined
                        : 'An older threat without a reference can\'t be edited.'
                    "
                    :loading="saving"
                    @click="openThreatEdit(threat)"
                    >Edit</Button
                  >
                  <Button
                    variant="danger"
                    :disabled-reason="
                      threat.threatRefId
                        ? undefined
                        : 'An older threat without a reference can\'t be removed.'
                    "
                    :loading="saving"
                    @click="removeThreat(threat)"
                    >Remove</Button
                  >
                </template>
                <Stack gap="1">
                  <Text v-if="threat.title">{{ threat.title }}</Text>
                  <Text variant="caption">System: {{ threat.system }}</Text>
                  <TextLink
                    v-if="threat.url && threat.safeUrl"
                    :href="threat.safeUrl"
                    >{{ threat.url }}</TextLink
                  >
                  <Text v-else-if="threat.url" variant="caption">{{
                    threat.url
                  }}</Text>
                </Stack>
              </Panel>
            </li>
          </Stack>
        </Stack>

        <Stack v-else-if="activeTab === 'remediations'" gap="4">
          <div>
            <Button
              icon="add"
              :loading="saving"
              @click="openPrimaryRemediationEditor"
              >{{
                hasRemediationTemplateResource
                  ? 'Edit remediation'
                  : 'Add remediation'
              }}</Button
            >
          </div>
          <Text v-if="!remediationItems.length" variant="caption"
            >No remediations have been recorded for this risk.</Text
          >
          <Stack v-else gap="3" as="ul">
            <li
              v-for="(remediation, remediationIndex) in remediationItems"
              :key="remediation.id || `remediation-${remediationIndex}`"
            >
              <Panel
                :title="remediation.title || 'Untitled remediation'"
                :level="3"
              >
                <template #actions>
                  <Button
                    :disabled-reason="
                      hasRemediationTemplateResource
                        ? undefined
                        : 'An older remediation can\'t be edited until a remediation template exists.'
                    "
                    :loading="saving"
                    @click="openRemediationEdit(remediation)"
                    >Edit</Button
                  >
                  <Button
                    variant="danger"
                    :disabled-reason="
                      hasRemediationTemplateResource
                        ? undefined
                        : 'An older remediation can\'t be removed until a remediation template exists.'
                    "
                    :loading="saving"
                    @click="removeRemediation(remediation)"
                    >Remove</Button
                  >
                </template>
                <Stack gap="2">
                  <Text>{{
                    remediation.description || 'No description.'
                  }}</Text>
                  <Text v-if="remediation.remarks" variant="caption"
                    >Remarks: {{ remediation.remarks }}</Text
                  >
                  <Stack v-if="remediation.tasks?.length" gap="1" as="ol">
                    <li
                      v-for="(task, taskIndex) in remediation.tasks"
                      :key="
                        task.id ||
                        task.title ||
                        `task-${remediationIndex}-${taskIndex}`
                      "
                    >
                      <Text as="span">{{ task.title }}</Text>
                    </li>
                  </Stack>
                </Stack>
              </Panel>
            </li>
          </Stack>
        </Stack>

        <Stack v-else-if="activeTab === 'reviews'" gap="4">
          <DataState
            :status="
              loadingReviews
                ? 'loading'
                : riskReviews.length
                  ? 'ready'
                  : 'empty'
            "
            subject="the reviews"
            empty-title="No reviews yet"
            empty-body="Reviews are recorded when an accepted risk is reviewed."
            skeleton="text"
          >
            <Stack gap="3" as="ol">
              <li v-for="review in riskReviews" :key="review.id">
                <Stack gap="1">
                  <Text as="span" variant="label">{{
                    formatTokenLabel(review.decision)
                  }}</Text>
                  <Text variant="caption"
                    >{{ formatDate(review.timestamp)
                    }}<template v-if="review.reviewer">
                      · {{ review.reviewer }}</template
                    ></Text
                  >
                  <Text>{{
                    review.notes || 'No notes were given for this review.'
                  }}</Text>
                  <Text v-if="review.nextReviewDeadline" variant="caption"
                    >Next review deadline:
                    {{ formatDate(review.nextReviewDeadline) }}</Text
                  >
                </Stack>
              </li>
            </Stack>
          </DataState>
          <Cluster
            v-if="riskReviews.length || reviewsPage > 1 || reviewsHasMore"
            justify="between"
            gap="2"
          >
            <Text variant="caption"
              >Page {{ reviewsPage
              }}<template v-if="reviewsTotalPages">
                of {{ reviewsTotalPages }}</template
              ></Text
            >
            <Cluster gap="2">
              <Button
                data-testid="reviews-pagination-prev"
                :disabled-reason="
                  reviewsPage <= 1 ? 'This is the first page.' : undefined
                "
                :loading="loadingReviews"
                @click="loadRiskReviews(reviewsPage - 1)"
                >Previous</Button
              >
              <Button
                data-testid="reviews-pagination-next"
                :disabled-reason="
                  reviewsHasMore ? undefined : 'This is the last page.'
                "
                :loading="loadingReviews"
                @click="loadRiskReviews(reviewsPage + 1)"
                >Next</Button
              >
            </Cluster>
          </Cluster>
        </Stack>

        <Stack v-else-if="activeTab === 'history-events'" gap="4">
          <DataState
            :status="
              loadingEvents ? 'loading' : riskEvents.length ? 'ready' : 'empty'
            "
            subject="the history"
            empty-title="No events yet"
            empty-body="Changes to this risk are recorded here."
            skeleton="text"
          >
            <Stack gap="3" as="ol">
              <li v-for="event in riskEvents" :key="event.id">
                <Stack gap="1">
                  <Text as="span" variant="label">{{ event.type }}</Text>
                  <Text variant="caption"
                    >{{ formatDate(event.timestamp)
                    }}<template v-if="event.actor">
                      · {{ event.actor }}</template
                    ></Text
                  >
                  <Text>{{ event.details || 'No more details.' }}</Text>
                </Stack>
              </li>
            </Stack>
          </DataState>
          <Cluster
            v-if="riskEvents.length || eventsPage > 1 || eventsHasMore"
            justify="between"
            gap="2"
          >
            <Text variant="caption"
              >Page {{ eventsPage
              }}<template v-if="eventsTotalPages">
                of {{ eventsTotalPages }}</template
              ></Text
            >
            <Cluster gap="2">
              <Button
                data-testid="events-pagination-prev"
                :disabled-reason="
                  eventsPage <= 1 ? 'This is the first page.' : undefined
                "
                :loading="loadingEvents"
                @click="loadRiskEvents(eventsPage - 1)"
                >Previous</Button
              >
              <Button
                data-testid="events-pagination-next"
                :disabled-reason="
                  eventsHasMore ? undefined : 'This is the last page.'
                "
                :loading="loadingEvents"
                @click="loadRiskEvents(eventsPage + 1)"
                >Next</Button
              >
            </Cluster>
          </Cluster>
        </Stack>

        <RiskPoamItemsTab
          v-else-if="activeTab === 'poam-items'"
          :risk-id="riskId!"
        />
      </Tabs>
    </Stack>

    <RiskAcceptModal
      v-if="risk && isSspContext"
      v-model:visible="showAcceptModal"
      :submitting="workflowSubmitting"
      :initial-owner-assignments="ownerAssignmentsSnapshot"
      @submit="submitAcceptRisk"
    />
    <RiskReviewModal
      v-if="risk && isSspContext"
      v-model:visible="showReviewModal"
      :submitting="workflowSubmitting"
      :acceptance-justification="overviewAcceptanceJustification"
      :review-deadline="overviewReviewDeadline"
      @submit="submitReviewRisk"
    />
    <RiskScoreReviewModal
      v-if="risk && isSspContext"
      v-model:visible="showScoreReviewModal"
      :submitting="workflowSubmitting"
      :current-likelihood="riskLikelihoodValue"
      :current-impact="riskImpactValue"
      @submit="submitRiskScoreReview"
    />
    <PromoteToPoamModal
      v-if="risk && isSspContext"
      v-model:visible="showPromoteToPoamModal"
      :submitting="promotingToPoam"
      :risk-title="risk?.title"
      :template-milestone-titles="undefined"
      @submit="submitPromoteToPoam"
    />

    <Dialog v-model:open="showThreatEditor" :title="threatEditorTitle">
      <form novalidate @submit.prevent="saveThreat">
        <Stack gap="4">
          <FormField label="Threat ID"
            ><TextInput
              v-model="workingThreat.id"
              data-testid="threat-id-input"
          /></FormField>
          <FormField label="System"
            ><TextInput
              v-model="workingThreat.system"
              data-testid="threat-system-input"
          /></FormField>
          <FormField label="Title"
            ><TextInput
              v-model="workingThreat.title"
              data-testid="threat-title-input"
          /></FormField>
          <FormField label="Reference URL"
            ><TextInput
              v-model="workingThreat.url"
              type="url"
              data-testid="threat-url-input"
          /></FormField>
          <Cluster justify="end" gap="2">
            <Button @click="closeThreatEditor">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              :loading="saving"
              data-testid="save-threat-button"
              >Save threat</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
    <Dialog
      v-model:open="showRemediationEditor"
      :title="remediationEditorTitle"
      size="l"
    >
      <form novalidate @submit.prevent="saveRemediation">
        <Stack gap="4">
          <FormField label="Title"
            ><TextInput
              v-model="workingRemediation.title"
              data-testid="remediation-title-input"
          /></FormField>
          <FormField label="Description"
            ><Textarea
              v-model="workingRemediation.description"
              :rows="4"
              data-testid="remediation-description-input"
          /></FormField>
          <FieldList
            v-model="workingRemediation.tasks"
            legend="Tasks"
            item-label="task"
            add-label="Add task"
            empty-text="No tasks."
            :new-item="() => ''"
          >
            <template #item="{ index }">
              <FormField label="Title"
                ><TextInput
                  v-model="workingRemediation.tasks[index]"
                  :data-testid="`remediation-task-input-${index}`"
              /></FormField>
            </template>
          </FieldList>
          <Cluster justify="end" gap="2">
            <Button @click="closeRemediationEditor">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              :loading="saving"
              data-testid="save-remediation-button"
              >Save remediation</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
    <Dialog
      v-model:open="showAssociationPicker"
      :title="associationPickerTitle"
      size="l"
    >
      <Stack gap="4">
        <FormField label="Search"
          ><TextInput v-model="pickerSearch" type="search" icon="search"
        /></FormField>
        <DataState
          :status="
            pickerLoading
              ? 'loading'
              : filteredPickerOptions.length
                ? 'ready'
                : 'empty'
          "
          :subject="associationLabel(pickerKind)"
          :empty-title="`No ${associationLabel(pickerKind)} to link`"
          empty-body="Everything that could be linked already is, or nothing matches the search."
          skeleton="text"
        >
          <Stack gap="2" as="ul">
            <li v-for="option in filteredPickerOptions" :key="option.id">
              <Cluster justify="between" gap="2">
                <Stack gap="1">
                  <Text as="span">{{ option.title }}</Text>
                  <Text as="span" variant="caption">{{
                    pickerOptionSubtitle(option)
                  }}</Text>
                </Stack>
                <Button :loading="saving" @click="linkAssociation(option)"
                  >Link</Button
                >
              </Cluster>
            </li>
          </Stack>
        </DataState>
      </Stack>
    </Dialog>
  </Stack>
</template>
