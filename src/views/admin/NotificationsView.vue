<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { isAxiosError, type AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import {
  decamelizeKeys,
  useAuthenticatedInstance,
  useDataApi,
} from '@/composables/axios';
import PageCard from '@/components/PageCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import Drawer from '@/volt/Drawer.vue';
import FormInput from '@/components/forms/FormInput.vue';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

type NotificationDestinationProvider = 'slack' | 'email';
type NotificationStatus = 'pass' | 'warn' | 'warning' | 'fail' | 'error';

interface NotificationDestination {
  provider: NotificationDestinationProvider;
  target: string;
}

interface PredeterminedNotification {
  name: string;
  displayName: string;
  description: string;
  configuredDestinations: NotificationDestination[];
}

interface NotificationConfigurationResponse {
  name: string;
  configuredDestinations: NotificationDestinationResponse[];
}

type NotificationProviderMetadataValue = string | number | boolean;

type NotificationProviderMetadata = Record<
  string,
  NotificationProviderMetadataValue
>;

interface NotificationProviderInfo {
  providerType: string;
  displayName: string;
  description: string;
  enabled: boolean;
  metadata?: NotificationProviderMetadata;
}

interface NotificationDestinationPayload {
  providerType: NotificationDestinationProvider;
  destinationTarget: string;
}

interface NotificationDestinationResponse {
  providerType: NotificationDestinationProvider;
  destinationTarget: string;
}

interface NotificationHealthQueue {
  name: string;
  maxWorkers?: number;
  available?: number;
  retryable?: number;
  running?: number;
  scheduled?: number;
  completed24h?: number;
  discarded24h?: number;
  oldestAvailableAt?: string | null;
  staleCount?: number;
  staleThresholdSeconds?: number;
}

interface NotificationHealthWarning {
  code: string;
  severity: string;
  message: string;
  target?: string;
}

interface NotificationHealthNotification {
  name: string;
  configuredDestinations?: NotificationDestinationResponse[];
  subscriberCounts?: Record<string, number>;
  warnings?: NotificationHealthWarning[];
}

interface NotificationHealthSchedule {
  name: string;
  jobKind: string;
  queue: string;
  enabled: boolean;
  schedule?: string;
  nextRunAt?: string | null;
  lastJob?: {
    id: number | string;
    state: string;
    createdAt?: string | null;
    finalizedAt?: string | null;
  } | null;
}

interface NotificationHealthResponse {
  worker?: {
    enabled?: boolean;
    mode?: string;
    pollOnly?: boolean;
    queues?: NotificationHealthQueue[];
  };
  providers?: NotificationProviderInfo[];
  notifications?: NotificationHealthNotification[];
  schedules?: NotificationHealthSchedule[];
  warnings?: NotificationHealthWarning[];
}

interface NotificationJob {
  id: number | string;
  state: string;
  queue: string;
  kind: string;
  attempt?: number;
  maxAttempts?: number;
  createdAt?: string | null;
  scheduledAt?: string | null;
  attemptedAt?: string | null;
  finalizedAt?: string | null;
  notificationKind?: string | null;
  provider?: string | null;
  target?: string | null;
  correlationId?: string | null;
  sourceJobKind?: string | null;
  sourceJobId?: string | number | null;
  lastError?: string | null;
  stale?: boolean;
}

interface NotificationJobsResponse {
  data: NotificationJob[];
  pagination?: {
    nextCursor?: string | null;
  };
}

interface NotificationJobDetail extends NotificationJob {
  metadata?: Record<string, unknown>;
  args?: Record<string, unknown>;
  errors?: Array<{
    attempt?: number;
    at?: string;
    error?: string;
  }>;
}

interface NotificationDiagnosticsCheck {
  code: string;
  label: string;
  status: NotificationStatus;
  message: string;
  jobId?: number | string;
  correlationId?: string;
}

interface NotificationDiagnosticsResponse {
  notificationName: string;
  status: NotificationStatus;
  checks: NotificationDiagnosticsCheck[];
  recommendedActions?: string[];
  subscriberCounts?: Record<string, number>;
  systemDestinations?: NotificationDestinationResponse[];
  destinations?: NotificationDestinationResponse[];
  recentJobs?: NotificationJob[];
  downstreamJobs?: NotificationJob[];
  staleJobs?: NotificationJob[];
  discardedJobs?: NotificationJob[];
  retryableErrors?: NotificationJob[];
  nextScheduledRun?: NotificationHealthSchedule | null;
}

interface NotificationTestResponse {
  accepted: boolean;
  mode: string;
  providerType: string;
  destinationTarget: string;
  jobIds?: Array<number | string>;
  message?: string;
}

interface NotificationOption {
  label: string;
  value: string;
}

const notificationDefinitions: Array<
  Omit<PredeterminedNotification, 'configuredDestinations'>
> = [
  {
    name: 'EVIDENCE_DIGEST',
    displayName: 'Evidence Digest',
    description: 'A digest of all evidence submitted to the CCF platform',
  },
  {
    name: 'WORKFLOW_EXECUTION_FAILED',
    displayName: 'Workflow Instance Failure',
    description: 'Notification for failed workflow instances',
  },
];

const queueOptions = [
  'email',
  'slack',
  'digest',
  'workflow',
  'risk',
  'poam',
  'scheduler',
];
const providerFilterOptions = ['email', 'slack'];
const stateOptions = [
  'available',
  'running',
  'retryable',
  'scheduled',
  'completed',
  'discarded',
];
const notificationFilterOptions: NotificationOption[] = [
  { label: 'Evidence Digest', value: 'evidence_digest' },
  { label: 'Workflow Task Assigned', value: 'workflow_task_assigned' },
  { label: 'Workflow Task Due Soon', value: 'workflow_task_due_soon' },
  { label: 'Workflow Task Digest', value: 'workflow_task_digest' },
  { label: 'Workflow Execution Failed', value: 'workflow_execution_failed' },
  { label: 'Workflow Task Digest Checker', value: 'workflow_task_digest_checker' },
  { label: 'Schedule Workflows', value: 'schedule_workflows' },
  { label: 'Risk Review Deadline Scanner', value: 'risk_review_deadline_reminder_scanner' },
  { label: 'Risk Overdue Escalation Scanner', value: 'risk_review_overdue_escalation_scanner' },
  { label: 'Risk Stale Risk Scanner', value: 'risk_stale_risk_scanner' },
  { label: 'Risk Open Digest Scheduler', value: 'risk_open_digest_scheduler' },
  { label: 'Risk Review Due Reminder', value: 'risk_review_due_reminder' },
  { label: 'Risk Review Overdue Escalation', value: 'risk_review_overdue_escalation' },
  { label: 'Risk Stale Open Reminder', value: 'risk_stale_open_reminder' },
  { label: 'Risk Open Digest', value: 'risk_open_digest' },
  { label: 'POAM Deadline Scanner', value: 'poam_deadline_reminder_scanner' },
  { label: 'POAM Overdue Transition Scanner', value: 'poam_overdue_transition_scanner' },
  { label: 'POAM Milestone Overdue Scanner', value: 'poam_milestone_overdue_scanner' },
  { label: 'POAM Open Digest Scheduler', value: 'poam_open_digest_scheduler' },
  { label: 'POAM Deadline Reminder', value: 'poam_deadline_reminder' },
  { label: 'POAM Overdue Notification', value: 'poam_overdue_notification' },
  { label: 'POAM Milestone Overdue Reminder', value: 'poam_milestone_overdue_reminder' },
  { label: 'POAM Open Digest', value: 'poam_open_digest' },
];
const diagnosticsNotificationOptions: NotificationOption[] = [
  { label: 'Evidence Digest', value: 'EVIDENCE_DIGEST' },
  { label: 'Workflow Notifications', value: 'WORKFLOW_EXECUTION_FAILED' },
  { label: 'Risk Notifications', value: 'RISK_NOTIFICATIONS' },
  { label: 'POAM Notifications', value: 'POAM_NOTIFICATIONS' },
];
const timeRangeOptions: NotificationOption[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All available', value: 'all' },
];
const sensitiveFieldNames = [
  'token',
  'secret',
  'credential',
  'htmlbody',
  'textbody',
  'blocks',
  'attachments',
];

const toast = useToast();
const axios = useAuthenticatedInstance();
const supportedProviders: Array<{
  label: string;
  value: NotificationDestinationProvider;
}> = [
  { label: 'Slack', value: 'slack' },
  { label: 'Email', value: 'email' },
];
const activeTab = ref('configuration');
const showAddDestinationsDialog = ref(false);
const activeNotificationName = ref<string | null>(null);
const selectedProvider = ref<NotificationDestinationProvider>('slack');
const destinationTarget = ref('');
const destinationFormError = ref('');
const slackDestinationStatusLoading = ref(true);
const slackDestinationConfigured = ref(false);
const slackDestinationStatusError = ref<string | null>(null);
const health = ref<NotificationHealthResponse | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);
const jobs = ref<NotificationJob[]>([]);
const jobsNextCursor = ref<string | null>(null);
const jobsLoading = ref(false);
const jobsError = ref<string | null>(null);
const jobDetail = ref<NotificationJobDetail | null>(null);
const jobDetailLoading = ref(false);
const jobDetailError = ref<string | null>(null);
const showJobDetailDrawer = ref(false);
const selectedJobId = ref<string | number | null>(null);
const selectedQueueFilter = ref('');
const selectedProviderFilter = ref('');
const selectedNotificationFilter = ref('');
const selectedStateFilter = ref('');
const selectedTimeRange = ref('24h');
const jobIdOrCorrelationFilter = ref('');
const autoRefreshJobs = ref(false);
const diagnosticsNotificationName = ref('EVIDENCE_DIGEST');
const diagnostics = ref<NotificationDiagnosticsResponse | null>(null);
const diagnosticsLoading = ref(false);
const diagnosticsError = ref<string | null>(null);
const testSendLoadingKey = ref<string | null>(null);
const testSendMessage = ref<string | null>(null);
let autoRefreshTimer: ReturnType<typeof window.setInterval> | undefined;

const {
  data: notificationConfigurations,
  isLoading: isLoadingNotifications,
  error: notificationsError,
  execute: loadNotifications,
} = useDataApi<NotificationConfigurationResponse[]>(
  '/api/admin/notifications',
  {},
  { immediate: true, initialData: [] },
);

const {
  data: notificationProviders,
  isLoading: isLoadingProviders,
  error: providersError,
  execute: loadProviders,
} = useDataApi<NotificationProviderInfo[]>(
  '/api/admin/notifications/providers',
  {},
  { immediate: true, initialData: [] },
);

const { execute: executeCreateDestination, isLoading: isCreatingDestination } =
  useDataApi<NotificationDestinationResponse>(
    null,
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: executeDeleteDestination, isLoading: isDeletingDestination } =
  useDataApi<void>(
    null,
    {
      method: 'DELETE',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const predeterminedNotifications = computed<PredeterminedNotification[]>(() => {
  const configurationsByName = new Map(
    (notificationConfigurations.value ?? []).map((configuration) => [
      configuration.name,
      configuration,
    ]),
  );

  return notificationDefinitions.map((definition) => {
    const configuration = configurationsByName.get(definition.name);

    return {
      ...definition,
      configuredDestinations:
        configuration?.configuredDestinations.map((destination) => ({
          provider: destination.providerType,
          target: destination.destinationTarget,
        })) ?? [],
    };
  });
});

const providerList = computed<NotificationProviderInfo[]>(() => {
  return notificationProviders.value ?? health.value?.providers ?? [];
});

const providerInfoByType = computed(() => {
  const providersByType = new Map<
    NotificationDestinationProvider,
    NotificationProviderInfo
  >();

  for (const provider of providerList.value) {
    const providerType = normalizeDestinationProvider(provider.providerType);

    if (providerType) {
      providersByType.set(providerType, provider);
    }
  }

  return providersByType;
});

const activeNotification = computed(() => {
  if (!activeNotificationName.value) {
    return null;
  }

  return (
    predeterminedNotifications.value.find(
      (notification) => notification.name === activeNotificationName.value,
    ) || null
  );
});

const activeProviderOption = computed(() => {
  return (
    supportedProviders.find(
      (provider) => provider.value === selectedProvider.value,
    ) || supportedProviders[0]
  );
});

const destinationTargetLabel = computed(() => {
  return selectedProvider.value === 'email' ? 'Email address' : 'Channel';
});

const destinationTargetPlaceholder = computed(() => {
  return activeProviderOption.value.value === 'email'
    ? 'team@example.com'
    : 'my-slack-channel';
});

const slackDestinationUnavailableReason = computed(() => {
  if (slackDestinationStatusLoading.value) {
    return 'Slack destinations are unavailable until Slack configuration finishes loading.';
  }

  if (slackDestinationStatusError.value) {
    return `Slack destinations are unavailable because Slack status could not be loaded: ${slackDestinationStatusError.value}`;
  }

  if (!slackDestinationConfigured.value) {
    return 'Slack destinations are unavailable because Slack integration is not configured for this environment.';
  }

  return null;
});

const selectableDestinationProviders = computed(() =>
  supportedProviders.filter(
    (provider) =>
      getDestinationProviderUnavailableReason(provider.value) === null,
  ),
);

const destinationProviderUnavailableReasons = computed(() => {
  const reasons: string[] = [];

  for (const provider of supportedProviders) {
    const unavailableReason = getDestinationProviderUnavailableReason(
      provider.value,
    );

    if (unavailableReason) {
      reasons.push(unavailableReason);
    }
  }

  return reasons;
});

const workerModeLabel = computed(() => {
  const worker = health.value?.worker;

  if (!worker) {
    return 'Unknown';
  }

  if (worker.pollOnly || worker.mode === 'polling') {
    return 'Polling';
  }

  return worker.mode === 'notify' ? 'Notify' : formatLabel(worker.mode);
});

const healthQueues = computed(() => {
  const queuesByName = new Map(
    (health.value?.worker?.queues ?? []).map((queue) => [queue.name, queue]),
  );
  const expectedQueues = queueOptions.map((queueName) => ({
    name: queueName,
    ...(queuesByName.get(queueName) ?? {}),
  }));
  const additionalQueues = (health.value?.worker?.queues ?? []).filter(
    (queue) => !queueOptions.includes(queue.name),
  );

  return [...expectedQueues, ...additionalQueues];
});
const healthNotifications = computed(() => health.value?.notifications ?? []);
const healthSchedules = computed(() => health.value?.schedules ?? []);
const healthWarnings = computed(() => {
  const warnings: NotificationHealthWarning[] = [...(health.value?.warnings ?? [])];

  for (const provider of providerList.value) {
    if (!provider.enabled) {
      warnings.push({
        code: `provider_${provider.providerType}_disabled`,
        severity: 'warning',
        message: `${provider.displayName || provider.providerType} provider is disabled.`,
        target: provider.providerType,
      });
    }
  }

  for (const notification of healthNotifications.value) {
    if ((notification.configuredDestinations ?? []).length === 0) {
      warnings.push({
        code: `missing_destination_${notification.name}`,
        severity: 'warning',
        message: `${formatNotificationName(notification.name)} has no configured system destination.`,
        target: notification.name,
      });
    }

    warnings.push(...(notification.warnings ?? []));
  }

  for (const queue of healthQueues.value) {
    if ((queue.staleCount ?? 0) > 0) {
      warnings.push({
        code: `stale_${queue.name}`,
        severity: 'warning',
        message: `${queue.name} queue has ${queue.staleCount} stale job${queue.staleCount === 1 ? '' : 's'}.`,
        target: queue.name,
      });
    }

    if ((queue.discarded24h ?? 0) > 0) {
      warnings.push({
        code: `discarded_${queue.name}`,
        severity: 'warning',
        message: `${queue.name} queue has ${queue.discarded24h} discarded job${queue.discarded24h === 1 ? '' : 's'} in the last 24 hours.`,
        target: queue.name,
      });
    }
  }

  if (healthSchedules.value.length === 0) {
    warnings.push({
      code: 'missing_schedule_runs',
      severity: 'warning',
      message: 'No upcoming scheduled notification runs were returned.',
      target: 'scheduler',
    });
  }

  for (const schedule of healthSchedules.value) {
    if (schedule.enabled && !schedule.nextRunAt) {
      warnings.push({
        code: `missing_next_run_${schedule.name}`,
        severity: 'warning',
        message: `${formatNotificationName(schedule.name)} has no next scheduled run.`,
        target: schedule.name,
      });
    }
  }

  return warnings;
});

const filteredJobs = computed(() => {
  const filter = jobIdOrCorrelationFilter.value.trim().toLowerCase();

  if (!filter) {
    return jobs.value;
  }

  return jobs.value.filter((job) => {
    return [
      String(job.id),
      String(job.correlationId ?? ''),
      String(job.sourceJobId ?? ''),
      String(job.sourceJobKind ?? ''),
    ].some((value) => value.toLowerCase().includes(filter));
  });
});

const selectedJobDetailMetadata = computed(() => {
  return sanitizePayload(jobDetail.value?.metadata ?? {});
});

const selectedJobDetailArgs = computed(() => {
  return sanitizePayload(jobDetail.value?.args ?? {});
});

const diagnosticsDestinations = computed(() => {
  return diagnostics.value?.systemDestinations ?? diagnostics.value?.destinations ?? [];
});
const diagnosticJobGroups = computed(() => [
  {
    label: 'Recent source/scanner jobs',
    jobs: diagnostics.value?.recentJobs ?? [],
  },
  {
    label: 'Downstream provider jobs',
    jobs: diagnostics.value?.downstreamJobs ?? [],
  },
  {
    label: 'Stale jobs',
    jobs: diagnostics.value?.staleJobs ?? [],
  },
  {
    label: 'Discarded jobs',
    jobs: diagnostics.value?.discardedJobs ?? [],
  },
  {
    label: 'Retryable errors',
    jobs: diagnostics.value?.retryableErrors ?? [],
  },
]);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeDestinationProvider(
  providerType: string,
): NotificationDestinationProvider | null {
  const normalizedProviderType = providerType.toLowerCase();

  if (
    normalizedProviderType === 'email' ||
    normalizedProviderType === 'slack'
  ) {
    return normalizedProviderType;
  }

  return null;
}

function getProviderLabel(provider: string): string {
  return (
    supportedProviders.find((option) => option.value === provider)?.label ??
    formatLabel(provider)
  );
}

function destinationProviderClasses(provider: string): string {
  switch (provider) {
    case 'slack':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'email':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
    default:
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function statusClasses(status: string): string {
  switch (status) {
    case 'pass':
    case 'completed':
    case 'enabled':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'warn':
    case 'warning':
    case 'retryable':
    case 'available':
    case 'scheduled':
      return 'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/40 dark:text-amber-200';
    case 'fail':
    case 'error':
    case 'discarded':
      return 'border-red-200 bg-red-100 text-red-800 dark:border-red-900/40 dark:bg-red-900/40 dark:text-red-200';
    case 'running':
      return 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/40 dark:text-blue-200';
    default:
      return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function formatMetadataLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLabel(value?: string | null): string {
  if (!value) {
    return 'Unknown';
  }

  return formatMetadataLabel(value);
}

function formatNotificationName(value?: string | null): string {
  return formatLabel(value ?? '');
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getProviderMetadataEntries(provider: NotificationProviderInfo): Array<{
  key: string;
  label: string;
  value: string;
}> {
  const metadata = provider.metadata ?? {};

  return Object.entries(metadata)
    .filter(([, value]) => String(value).trim() !== '')
    .map(([key, value]) => ({
      key,
      label: formatMetadataLabel(key),
      value: String(value),
    }));
}

function getDefaultDestinationProvider(): NotificationDestinationProvider {
  return selectableDestinationProviders.value[0]?.value ?? 'email';
}

function getProviderDisabledReason(
  provider: NotificationDestinationProvider,
): string | null {
  const providerInfo = providerInfoByType.value.get(provider);

  if (providerInfo?.enabled === false) {
    const providerLabel = getProviderLabel(provider);
    const providerDescription =
      provider === 'email' ? providerLabel.toLowerCase() : providerLabel;

    return `${providerLabel} destinations are unavailable because ${providerDescription} notifications are disabled for this environment.`;
  }

  return null;
}

function getDestinationProviderUnavailableReason(
  provider: NotificationDestinationProvider,
): string | null {
  const providerDisabledReason = getProviderDisabledReason(provider);

  if (providerDisabledReason) {
    return providerDisabledReason;
  }

  if (provider === 'slack') {
    return slackDestinationUnavailableReason.value;
  }

  return null;
}

function isProviderDisabled(
  provider: NotificationDestinationProvider,
): boolean {
  return getDestinationProviderUnavailableReason(provider) !== null;
}

function buildDestinationMutationUrl(notificationName: string): string {
  return `/api/admin/notifications/${encodeURIComponent(notificationName)}/destinations`;
}

function buildDestinationPayload(
  provider: NotificationDestinationProvider,
  target: string,
): NotificationDestinationPayload {
  return {
    providerType: provider,
    destinationTarget: target,
  };
}

function buildDestinationKey(
  notificationName: string,
  provider: NotificationDestinationProvider,
  target: string,
): string {
  return `${notificationName}:${provider}:${target.toLowerCase()}`;
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse<ErrorBody>>;
    const responseBody = axiosError.response?.data?.errors?.body;
    if (responseBody) {
      return responseBody;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function sinceForRange(range: string): string | undefined {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (range === '24h') {
    return new Date(now - day).toISOString();
  }

  if (range === '7d') {
    return new Date(now - 7 * day).toISOString();
  }

  if (range === '30d') {
    return new Date(now - 30 * day).toISOString();
  }

  return undefined;
}

function buildJobsParams(cursor?: string) {
  return {
    queue: selectedQueueFilter.value || undefined,
    provider: selectedProviderFilter.value || undefined,
    notificationKind: selectedNotificationFilter.value || undefined,
    state: selectedStateFilter.value || undefined,
    since: sinceForRange(selectedTimeRange.value),
    limit: 50,
    cursor,
  };
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sensitiveFieldNames.some((fieldName) => normalized.includes(fieldName));
}

function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayload(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, entry]) => [key, sanitizePayload(entry)]),
    );
  }

  return value;
}

function stringifyPayload(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function loadSlackDestinationStatus() {
  slackDestinationStatusLoading.value = true;
  slackDestinationStatusError.value = null;

  try {
    await axios.get('/api/auth/slack/link/status');
    slackDestinationConfigured.value = true;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      slackDestinationConfigured.value = false;
      return;
    }

    const errorMessage = getApiErrorMessage(
      error,
      'Failed to load Slack link status.',
    );

    slackDestinationConfigured.value = false;
    slackDestinationStatusError.value = errorMessage;
    toast.add({
      severity: 'error',
      summary: 'Slack Status Unavailable',
      detail: errorMessage,
      life: 4000,
    });
  } finally {
    slackDestinationStatusLoading.value = false;
  }
}

async function loadHealth() {
  healthLoading.value = true;
  healthError.value = null;

  try {
    const response = await axios.get<{ data: NotificationHealthResponse }>(
      '/api/admin/notifications/health',
    );
    health.value = response.data.data;
  } catch (error) {
    health.value = null;
    healthError.value = getApiErrorMessage(
      error,
      'Notification health is unavailable.',
    );
  } finally {
    healthLoading.value = false;
  }
}

async function loadJobs(cursor?: string) {
  jobsLoading.value = true;
  jobsError.value = null;

  try {
    const response = await axios.get<NotificationJobsResponse>(
      '/api/admin/notifications/jobs',
      {
        params: buildJobsParams(cursor),
      },
    );
    const nextJobs = response.data.data ?? [];
    jobs.value = cursor ? [...jobs.value, ...nextJobs] : nextJobs;
    jobsNextCursor.value = response.data.pagination?.nextCursor ?? null;
  } catch (error) {
    if (!cursor) {
      jobs.value = [];
    }
    jobsError.value = getApiErrorMessage(
      error,
      'Notification delivery jobs are unavailable.',
    );
  } finally {
    jobsLoading.value = false;
  }
}

async function openJobDetail(job: NotificationJob) {
  selectedJobId.value = job.id;
  showJobDetailDrawer.value = true;
  jobDetailLoading.value = true;
  jobDetailError.value = null;
  jobDetail.value = null;

  try {
    const response = await axios.get<{ data: NotificationJobDetail }>(
      `/api/admin/notifications/jobs/${encodeURIComponent(String(job.id))}`,
    );
    jobDetail.value = response.data.data;
  } catch (error) {
    jobDetailError.value = getApiErrorMessage(
      error,
      'Notification job details are unavailable.',
    );
  } finally {
    jobDetailLoading.value = false;
  }
}

async function loadDiagnostics() {
  diagnosticsLoading.value = true;
  diagnosticsError.value = null;
  diagnostics.value = null;

  try {
    const response = await axios.get<{ data: NotificationDiagnosticsResponse }>(
      `/api/admin/notifications/${encodeURIComponent(diagnosticsNotificationName.value)}/diagnostics`,
    );
    diagnostics.value = response.data.data;
  } catch (error) {
    diagnosticsError.value = getApiErrorMessage(
      error,
      'Notification diagnostics are unavailable.',
    );
  } finally {
    diagnosticsLoading.value = false;
  }
}

async function sendTestNotification(
  providerType: NotificationDestinationProvider,
  destinationTarget: string,
) {
  const key = `${providerType}:${destinationTarget}`;
  testSendLoadingKey.value = key;
  testSendMessage.value = null;

  try {
    const response = await axios.post<{ data: NotificationTestResponse }>(
      '/api/admin/notifications/test',
      {
        providerType,
        destinationTarget,
        mode: 'enqueue',
      },
    );
    testSendMessage.value =
      response.data.data.message ?? 'Test notification accepted.';
    toast.add({
      severity: 'success',
      summary: 'Test Notification',
      detail: testSendMessage.value,
      life: 3000,
    });
  } catch (error) {
    testSendMessage.value = getApiErrorMessage(
      error,
      'Test notification endpoint is unavailable.',
    );
    toast.add({
      severity: 'error',
      summary: 'Test Notification Failed',
      detail: testSendMessage.value,
      life: 4000,
    });
  } finally {
    testSendLoadingKey.value = null;
  }
}

function appendDestinationToNotificationConfiguration(
  notificationName: string,
  destination: NotificationDestinationResponse,
) {
  const existingConfiguration = (notificationConfigurations.value ?? []).find(
    (configuration) => configuration.name === notificationName,
  );

  if (!existingConfiguration) {
    notificationConfigurations.value = [
      ...(notificationConfigurations.value ?? []),
      {
        name: notificationName,
        configuredDestinations: [destination],
      },
    ];
    return;
  }

  notificationConfigurations.value = (
    notificationConfigurations.value ?? []
  ).map((configuration) => {
    if (configuration.name !== notificationName) {
      return configuration;
    }

    return {
      ...configuration,
      configuredDestinations: [
        ...configuration.configuredDestinations,
        destination,
      ],
    };
  });
}

function removeDestinationFromNotificationConfiguration(
  notificationName: string,
  provider: NotificationDestinationProvider,
  target: string,
) {
  notificationConfigurations.value = (
    notificationConfigurations.value ?? []
  ).map((configuration) => {
    if (configuration.name !== notificationName) {
      return configuration;
    }

    return {
      ...configuration,
      configuredDestinations: configuration.configuredDestinations.filter(
        (destination) =>
          !(
            destination.providerType.toLowerCase() === provider.toLowerCase() &&
            destination.destinationTarget.toLowerCase() === target.toLowerCase()
          ),
      ),
    };
  });
}

const deletingDestinationKey = ref<string | null>(null);

function isDestinationBeingDeleted(
  notificationName: string,
  provider: NotificationDestinationProvider,
  target: string,
): boolean {
  return (
    deletingDestinationKey.value ===
    buildDestinationKey(notificationName, provider, target)
  );
}

function isTestSendLoading(
  provider: NotificationDestinationProvider,
  target: string,
): boolean {
  return testSendLoadingKey.value === `${provider}:${target}`;
}

function openAddDestinationsDialog(notificationName: string) {
  activeNotificationName.value = notificationName;
  selectedProvider.value = getDefaultDestinationProvider();
  destinationTarget.value = '';
  destinationFormError.value = '';
  showAddDestinationsDialog.value = true;
}

function closeAddDestinationsDialog() {
  showAddDestinationsDialog.value = false;
  activeNotificationName.value = null;
  selectedProvider.value = getDefaultDestinationProvider();
  destinationTarget.value = '';
  destinationFormError.value = '';
}

async function addDestination() {
  if (!activeNotification.value) {
    destinationFormError.value =
      'Select a notification before adding a destination.';
    return;
  }

  const trimmedTarget = destinationTarget.value.trim();

  if (!selectedProvider.value || !trimmedTarget) {
    destinationFormError.value =
      'Choose a provider and enter a destination target.';
    return;
  }

  const providerUnavailableReason = getDestinationProviderUnavailableReason(
    selectedProvider.value,
  );

  if (providerUnavailableReason) {
    destinationFormError.value = providerUnavailableReason;
    return;
  }

  if (selectedProvider.value === 'email' && !isValidEmail(trimmedTarget)) {
    destinationFormError.value = 'Enter a valid email address.';
    return;
  }

  const duplicateExists = activeNotification.value.configuredDestinations.some(
    (destination) =>
      destination.provider.toLowerCase() ===
        selectedProvider.value.toLowerCase() &&
      destination.target.toLowerCase() === trimmedTarget.toLowerCase(),
  );

  if (duplicateExists) {
    destinationFormError.value =
      'That destination is already configured for this notification.';
    return;
  }

  const payload = buildDestinationPayload(
    selectedProvider.value,
    trimmedTarget,
  );
  const notificationName = activeNotification.value.name;
  destinationFormError.value = '';

  try {
    const response = await executeCreateDestination(
      buildDestinationMutationUrl(notificationName),
      {
        data: payload,
      },
    );

    const createdDestination = response.data.value?.data ?? payload;

    appendDestinationToNotificationConfiguration(
      notificationName,
      createdDestination,
    );

    toast.add({
      severity: 'success',
      summary: 'Destination Added',
      detail: `${getProviderLabel(createdDestination.providerType)} destination added successfully.`,
      life: 3000,
    });

    closeAddDestinationsDialog();
  } catch (error) {
    destinationFormError.value = getApiErrorMessage(
      error,
      'Failed to add destination.',
    );
    toast.add({
      severity: 'error',
      summary: 'Add Destination Failed',
      detail: destinationFormError.value,
      life: 4000,
    });
  }
}

async function removeDestination(
  notificationName: string,
  provider: NotificationDestinationProvider,
  target: string,
) {
  const payload = buildDestinationPayload(provider, target);
  deletingDestinationKey.value = buildDestinationKey(
    notificationName,
    provider,
    target,
  );

  try {
    await executeDeleteDestination(
      buildDestinationMutationUrl(notificationName),
      {
        data: payload,
      },
    );

    removeDestinationFromNotificationConfiguration(
      notificationName,
      provider,
      target,
    );

    toast.add({
      severity: 'success',
      summary: 'Destination Removed',
      detail: `${getProviderLabel(provider)} destination removed successfully.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Remove Destination Failed',
      detail: getApiErrorMessage(error, 'Failed to remove destination.'),
      life: 4000,
    });
  } finally {
    deletingDestinationKey.value = null;
  }
}

function applyJobFilters() {
  void loadJobs();
}

function linkToDeliveries(filter: string) {
  activeTab.value = 'deliveries';
  jobIdOrCorrelationFilter.value = filter;
}

watch(selectableDestinationProviders, () => {
  if (!isProviderDisabled(selectedProvider.value)) {
    return;
  }

  selectedProvider.value = getDefaultDestinationProvider();
});

watch(diagnosticsNotificationName, () => {
  if (activeTab.value === 'diagnostics') {
    void loadDiagnostics();
  }
});

watch(autoRefreshJobs, (enabled) => {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }

  if (enabled) {
    autoRefreshTimer = window.setInterval(() => {
      void loadJobs();
    }, 30000);
  }
});

onMounted(() => {
  void loadSlackDestinationStatus();
  void loadHealth();
  void loadJobs();
});

onUnmounted(() => {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
  }
});
</script>

<template>
  <PageHeader> Notifications </PageHeader>

  <div class="mt-8 space-y-5">
    <div
      class="flex flex-wrap gap-2 border-b border-ccf-300 dark:border-slate-700"
      role="tablist"
      aria-label="Notification administration tabs"
    >
      <button
        v-for="tab in [
          ['configuration', 'Configuration'],
          ['health', 'Health'],
          ['deliveries', 'Deliveries'],
          ['diagnostics', 'Diagnostics'],
        ]"
        :key="tab[0]"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab[0]"
        class="min-h-10 border-b-2 px-3 text-sm font-semibold"
        :class="
          activeTab === tab[0]
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100'
        "
        @click="
          activeTab = tab[0];
          if (tab[0] === 'diagnostics' && !diagnostics) loadDiagnostics();
        "
      >
        {{ tab[1] }}
      </button>
    </div>

    <section
      v-if="activeTab === 'configuration'"
      aria-labelledby="configuration-heading"
      class="space-y-6"
    >
      <div>
        <h2
          id="configuration-heading"
          class="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Configuration
        </h2>
        <p class="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Provider readiness and destination mappings for system notifications.
        </p>
      </div>

      <section aria-labelledby="providers-heading" class="space-y-4">
        <div>
          <h3
            id="providers-heading"
            class="text-base font-semibold text-gray-900 dark:text-white"
          >
            Providers
          </h3>
        </div>

        <div
          v-if="providersError"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              {{
                getApiErrorMessage(
                  providersError,
                  'Failed to load notification providers.',
                )
              }}
            </span>
            <SecondaryButton type="button" @click="loadProviders">
              Retry
            </SecondaryButton>
          </div>
        </div>

        <div
          v-if="isLoadingProviders"
          class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
        >
          Loading provider configuration...
        </div>

        <div v-if="!isLoadingProviders && !providersError" class="space-y-3">
          <div
            v-if="providerList.length === 0"
            class="rounded-lg border border-dashed border-ccf-300 bg-ccf-100 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            No providers configured yet.
          </div>

          <div
            v-if="providerList.length > 0"
            class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            <PageCard
              v-for="provider in providerList"
              :key="provider.providerType"
              :class="
                provider.enabled
                  ? 'h-full'
                  : 'h-full opacity-70 saturate-50 brightness-95'
              "
            >
              <div class="flex h-full min-h-36 flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                  <span
                    class="inline-flex w-fit min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold uppercase tracking-[0.08em]"
                    :class="destinationProviderClasses(provider.providerType)"
                  >
                    {{ provider.providerType }}
                  </span>
                  <span
                    class="inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold"
                    :class="
                      provider.enabled
                        ? statusClasses('enabled')
                        : statusClasses('disabled')
                    "
                  >
                    {{ provider.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>

                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ provider.description }}
                </p>

                <span
                  v-for="meta in getProviderMetadataEntries(provider)"
                  :key="meta.key"
                  class="inline-flex w-fit min-h-2 text-xs"
                >
                  {{ meta.label }}: {{ meta.value }}
                </span>
              </div>
            </PageCard>
          </div>
        </div>
      </section>

      <section aria-labelledby="notifications-heading" class="space-y-4">
        <div>
          <h3
            id="notifications-heading"
            class="text-base font-semibold text-gray-900 dark:text-white"
          >
            Notifications
          </h3>
        </div>

        <div
          v-if="notificationsError"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              {{
                getApiErrorMessage(
                  notificationsError,
                  'Failed to load notifications.',
                )
              }}
            </span>
            <SecondaryButton type="button" @click="loadNotifications">
              Retry
            </SecondaryButton>
          </div>
        </div>

        <div
          v-if="isLoadingNotifications"
          class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
        >
          Loading notification configuration...
        </div>

        <div
          v-if="!isLoadingNotifications && !notificationsError"
          class="space-y-4"
        >
          <PageCard
            v-for="notification in predeterminedNotifications"
            :key="notification.name"
          >
            <div class="space-y-5">
              <div
                class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div class="space-y-1">
                  <h4
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {{ notification.displayName }}
                  </h4>
                  <p class="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
                    {{ notification.description }}
                  </p>
                </div>

                <SecondaryButton
                  type="button"
                  @click="openAddDestinationsDialog(notification.name)"
                >
                  Add Destination
                </SecondaryButton>
              </div>

              <div
                v-if="notification.configuredDestinations.length > 0"
                class="space-y-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400"
                >
                  Configured Destinations
                </p>

                <div
                  class="overflow-hidden rounded-lg border border-ccf-300 dark:border-slate-700"
                >
                  <div
                    v-for="destination in notification.configuredDestinations"
                    :key="`${notification.name}-${destination.provider}-${destination.target}`"
                    class="flex flex-col gap-3 bg-white px-4 py-3 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        :class="destinationProviderClasses(destination.provider)"
                      >
                        {{ getProviderLabel(destination.provider) }}
                      </span>
                      <span class="break-all text-sm text-gray-600 dark:text-gray-400">
                        {{ destination.target }}
                      </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        class="text-sm font-medium text-ccf-700 hover:text-ccf-900 dark:text-slate-200 dark:hover:text-white"
                        :disabled="isTestSendLoading(destination.provider, destination.target)"
                        @click="
                          sendTestNotification(
                            destination.provider,
                            destination.target,
                          )
                        "
                      >
                        {{
                          isTestSendLoading(destination.provider, destination.target)
                            ? 'Sending...'
                            : 'Send test notification'
                        }}
                      </button>
                      <button
                        type="button"
                        :disabled="
                          isDeletingDestination ||
                          isDestinationBeingDeleted(
                            notification.name,
                            destination.provider,
                            destination.target,
                          )
                        "
                        class="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                        @click="
                          removeDestination(
                            notification.name,
                            destination.provider,
                            destination.target,
                          )
                        "
                      >
                        {{
                          isDestinationBeingDeleted(
                            notification.name,
                            destination.provider,
                            destination.target,
                          )
                            ? 'Removing...'
                            : 'Remove'
                        }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="rounded-lg border border-dashed border-ccf-300 bg-ccf-100 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                No destinations configured yet.
              </div>
            </div>
          </PageCard>
        </div>
      </section>
    </section>

    <section
      v-if="activeTab === 'health'"
      aria-labelledby="health-heading"
      class="space-y-5"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2
            id="health-heading"
            class="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Health
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Readiness, queue state, subscribers, destinations, and scheduled runs.
          </p>
        </div>
        <SecondaryButton type="button" :disabled="healthLoading" @click="loadHealth">
          Refresh
        </SecondaryButton>
      </div>

      <div
        v-if="healthError"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      >
        {{ healthError }}
      </div>
      <div
        v-if="healthLoading"
        class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
      >
        Loading notification health...
      </div>

      <template v-if="!healthLoading && !healthError">
        <div
          v-if="healthWarnings.length > 0"
          class="space-y-2"
          aria-label="Notification health warnings"
        >
          <div
            v-for="warning in healthWarnings"
            :key="`${warning.code}-${warning.target ?? ''}`"
            class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100"
          >
            <span class="font-semibold">{{ formatLabel(warning.severity) }}:</span>
            {{ warning.message }}
            <span v-if="warning.target" class="text-xs">({{ warning.target }})</span>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-3">
          <PageCard>
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                Worker Mode
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ workerModeLabel }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Worker {{ health?.worker?.enabled ? 'enabled' : 'disabled or unknown' }}
              </p>
            </div>
          </PageCard>
          <PageCard>
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                Stale Jobs
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ healthQueues.reduce((total, queue) => total + (queue.staleCount ?? 0), 0) }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Oldest waiting:
                {{
                  formatDate(
                    healthQueues
                      .map((queue) => queue.oldestAvailableAt)
                      .filter(Boolean)
                      .sort()[0] ?? null,
                  )
                }}
              </p>
            </div>
          </PageCard>
          <PageCard>
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                Upcoming Runs
              </p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ healthSchedules.filter((schedule) => schedule.enabled && schedule.nextRunAt).length }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Enabled schedules with a next run.
              </p>
            </div>
          </PageCard>
        </div>

        <PageCard>
          <div class="space-y-3">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              Provider Readiness
            </h3>
            <div class="grid gap-3 md:grid-cols-2">
              <div
                v-for="provider in providerList"
                :key="`health-${provider.providerType}`"
                class="rounded-lg border border-ccf-300 p-3 dark:border-slate-700"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ provider.displayName || getProviderLabel(provider.providerType) }}
                  </span>
                  <span
                    class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                    :class="
                      provider.enabled
                        ? statusClasses('enabled')
                        : statusClasses('disabled')
                    "
                  >
                    {{ provider.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {{ provider.description }}
                </p>
              </div>
              <div
                v-if="providerList.length === 0"
                class="rounded-lg border border-dashed border-ccf-300 p-3 text-sm text-gray-600 dark:border-slate-700 dark:text-gray-400"
              >
                No provider readiness returned.
              </div>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <div class="space-y-3">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              Queue Summary
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
                  <tr>
                    <th class="px-3 py-2">Queue</th>
                    <th class="px-3 py-2">Workers</th>
                    <th class="px-3 py-2">Available</th>
                    <th class="px-3 py-2">Retryable</th>
                    <th class="px-3 py-2">Running</th>
                    <th class="px-3 py-2">Scheduled</th>
                    <th class="px-3 py-2">Completed 24h</th>
                    <th class="px-3 py-2">Discarded 24h</th>
                    <th class="px-3 py-2">Stale</th>
                    <th class="px-3 py-2">Oldest Waiting</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
                  <tr v-for="queue in healthQueues" :key="queue.name">
                    <td class="px-3 py-2 font-medium">{{ queue.name }}</td>
                    <td class="px-3 py-2">{{ queue.maxWorkers ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.available ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.retryable ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.running ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.scheduled ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.completed24h ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.discarded24h ?? 0 }}</td>
                    <td class="px-3 py-2">{{ queue.staleCount ?? 0 }}</td>
                    <td class="px-3 py-2">{{ formatDate(queue.oldestAvailableAt) }}</td>
                  </tr>
                  <tr v-if="healthQueues.length === 0">
                    <td colspan="10" class="px-3 py-4 text-gray-600 dark:text-gray-400">
                      No queue health returned.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </PageCard>

        <div class="grid gap-3 xl:grid-cols-2">
          <PageCard>
            <div class="space-y-3">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Subscribers and Destinations
              </h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                  <thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th class="px-3 py-2">Notification</th>
                      <th class="px-3 py-2">Email</th>
                      <th class="px-3 py-2">Slack</th>
                      <th class="px-3 py-2">Users</th>
                      <th class="px-3 py-2">System Destinations</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
                    <tr
                      v-for="notification in healthNotifications"
                      :key="notification.name"
                    >
                      <td class="px-3 py-2 font-medium">
                        {{ formatNotificationName(notification.name) }}
                      </td>
                      <td class="px-3 py-2">{{ notification.subscriberCounts?.email ?? 0 }}</td>
                      <td class="px-3 py-2">{{ notification.subscriberCounts?.slack ?? 0 }}</td>
                      <td class="px-3 py-2">{{ notification.subscriberCounts?.totalUsers ?? 0 }}</td>
                      <td class="px-3 py-2">
                        {{ notification.configuredDestinations?.length ?? 0 }}
                      </td>
                    </tr>
                    <tr v-if="healthNotifications.length === 0">
                      <td colspan="5" class="px-3 py-4 text-gray-600 dark:text-gray-400">
                        No notification health returned.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </PageCard>

          <PageCard>
            <div class="space-y-3">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Upcoming Scheduled Runs
              </h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                  <thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th class="px-3 py-2">Notification</th>
                      <th class="px-3 py-2">Kind</th>
                      <th class="px-3 py-2">Queue</th>
                      <th class="px-3 py-2">Next Run</th>
                      <th class="px-3 py-2">Last Job</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
                    <tr v-for="schedule in healthSchedules" :key="`${schedule.name}-${schedule.jobKind}`">
                      <td class="px-3 py-2 font-medium">
                        {{ formatNotificationName(schedule.name) }}
                      </td>
                      <td class="px-3 py-2">{{ schedule.jobKind }}</td>
                      <td class="px-3 py-2">{{ schedule.queue }}</td>
                      <td class="px-3 py-2">{{ formatDate(schedule.nextRunAt) }}</td>
                      <td class="px-3 py-2">
                        <button
                          v-if="schedule.lastJob?.id"
                          type="button"
                          class="font-medium text-primary hover:underline"
                          @click="linkToDeliveries(String(schedule.lastJob.id))"
                        >
                          {{ schedule.lastJob.id }} · {{ schedule.lastJob.state }}
                        </button>
                        <span v-else>None</span>
                      </td>
                    </tr>
                    <tr v-if="healthSchedules.length === 0">
                      <td colspan="5" class="px-3 py-4 text-gray-600 dark:text-gray-400">
                        No scheduled notification runs returned.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </PageCard>
        </div>
      </template>
    </section>

    <section
      v-if="activeTab === 'deliveries'"
      aria-labelledby="deliveries-heading"
      class="space-y-5"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2
            id="deliveries-heading"
            class="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Deliveries
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            River notification jobs are read-only here. No retry, discard, cancel, or edit actions are available.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input v-model="autoRefreshJobs" type="checkbox" class="h-4 w-4" />
            Auto-refresh 30s
          </label>
          <SecondaryButton type="button" :disabled="jobsLoading" @click="loadJobs()">
            Refresh
          </SecondaryButton>
        </div>
      </div>

      <PageCard>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">Notification</span>
            <select
              v-model="selectedNotificationFilter"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @change="applyJobFilters"
            >
              <option value="">All notifications</option>
              <option
                v-for="option in notificationFilterOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">Provider</span>
            <select
              v-model="selectedProviderFilter"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @change="applyJobFilters"
            >
              <option value="">All providers</option>
              <option v-for="provider in providerFilterOptions" :key="provider" :value="provider">
                {{ getProviderLabel(provider) }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">Queue</span>
            <select
              v-model="selectedQueueFilter"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @change="applyJobFilters"
            >
              <option value="">All queues</option>
              <option v-for="queue in queueOptions" :key="queue" :value="queue">
                {{ queue }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">State</span>
            <select
              v-model="selectedStateFilter"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @change="applyJobFilters"
            >
              <option value="">All states</option>
              <option v-for="state in stateOptions" :key="state" :value="state">
                {{ formatLabel(state) }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">Time range</span>
            <select
              v-model="selectedTimeRange"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @change="applyJobFilters"
            >
              <option
                v-for="option in timeRangeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">Job or correlation</span>
            <input
              v-model="jobIdOrCorrelationFilter"
              type="search"
              class="w-full rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              placeholder="Filter loaded jobs"
            />
          </label>
        </div>
      </PageCard>

      <div
        v-if="jobsError"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      >
        {{ jobsError }}
      </div>
      <div
        v-if="jobsLoading && jobs.length === 0"
        class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
      >
        Loading delivery jobs...
      </div>

      <PageCard v-if="!jobsLoading || jobs.length > 0">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th class="px-3 py-2">Created</th>
                <th class="px-3 py-2">Job ID</th>
                <th class="px-3 py-2">Notification</th>
                <th class="px-3 py-2">Provider</th>
                <th class="px-3 py-2">Queue</th>
                <th class="px-3 py-2">Kind</th>
                <th class="px-3 py-2">State</th>
                <th class="px-3 py-2">Attempts</th>
                <th class="px-3 py-2">Target</th>
                <th class="px-3 py-2">Last Error</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ccf-200 dark:divide-slate-800">
              <tr
                v-for="job in filteredJobs"
                :key="job.id"
                class="align-top hover:bg-ccf-100 dark:hover:bg-slate-800"
              >
                <td class="px-3 py-2">{{ formatDate(job.createdAt) }}</td>
                <td class="px-3 py-2">
                  <button
                    type="button"
                    class="font-medium text-primary hover:underline"
                    @click="openJobDetail(job)"
                  >
                    {{ job.id }}
                  </button>
                </td>
                <td class="px-3 py-2">{{ formatNotificationName(job.notificationKind) }}</td>
                <td class="px-3 py-2">{{ getProviderLabel(job.provider ?? '') }}</td>
                <td class="px-3 py-2">{{ job.queue }}</td>
                <td class="px-3 py-2">{{ job.kind }}</td>
                <td class="px-3 py-2">
                  <span
                    class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                    :class="statusClasses(job.state)"
                  >
                    {{ job.stale ? 'Stale ' : '' }}{{ formatLabel(job.state) }}
                  </span>
                </td>
                <td class="px-3 py-2">{{ job.attempt ?? 0 }}/{{ job.maxAttempts ?? 0 }}</td>
                <td class="px-3 py-2 break-all">{{ job.target ?? 'None' }}</td>
                <td class="max-w-sm px-3 py-2 text-red-700 dark:text-red-300">
                  {{ job.lastError ?? 'None' }}
                </td>
              </tr>
              <tr v-if="filteredJobs.length === 0">
                <td colspan="10" class="px-3 py-4 text-gray-600 dark:text-gray-400">
                  No notification delivery jobs match the current filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="jobsNextCursor" class="mt-4">
          <SecondaryButton
            type="button"
            :disabled="jobsLoading"
            @click="loadJobs(jobsNextCursor ?? undefined)"
          >
            Load More
          </SecondaryButton>
        </div>
      </PageCard>
    </section>

    <section
      v-if="activeTab === 'diagnostics'"
      aria-labelledby="diagnostics-heading"
      class="space-y-5"
    >
      <div
        class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h2
            id="diagnostics-heading"
            class="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Diagnostics
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Read-only checks for evidence digest, workflow, risk, and POAM notifications.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label class="space-y-1 text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-300">
              Notification type
            </span>
            <select
              v-model="diagnosticsNotificationName"
              class="min-w-64 rounded-md border border-ccf-300 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option
                v-for="option in diagnosticsNotificationOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <SecondaryButton
            type="button"
            :disabled="diagnosticsLoading"
            @click="loadDiagnostics"
          >
            Run Diagnostics
          </SecondaryButton>
        </div>
      </div>

      <div
        v-if="diagnosticsError"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      >
        {{ diagnosticsError }}
      </div>
      <div
        v-if="diagnosticsLoading"
        class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
      >
        Running diagnostics...
      </div>

      <template v-if="diagnostics && !diagnosticsLoading">
        <PageCard>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ formatNotificationName(diagnostics.notificationName) }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Overall status
              </p>
            </div>
            <span
              class="inline-flex w-fit rounded-md border px-2.5 py-1 text-xs font-semibold"
              :class="statusClasses(diagnostics.status)"
            >
              {{ formatLabel(diagnostics.status) }}
            </span>
          </div>
        </PageCard>

        <PageCard>
          <div class="space-y-3">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              Checks
            </h3>
            <div class="divide-y divide-ccf-200 dark:divide-slate-800">
              <div
                v-for="check in diagnostics.checks"
                :key="check.code"
                class="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between"
              >
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
                      :class="statusClasses(check.status)"
                    >
                      {{ formatLabel(check.status) }}
                    </span>
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ check.label }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ check.message }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="check.jobId"
                    type="button"
                    class="text-sm font-medium text-primary hover:underline"
                    @click="linkToDeliveries(String(check.jobId))"
                  >
                    Job {{ check.jobId }}
                  </button>
                  <button
                    v-if="check.correlationId"
                    type="button"
                    class="text-sm font-medium text-primary hover:underline"
                    @click="linkToDeliveries(check.correlationId)"
                  >
                    Correlation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PageCard>

        <div class="grid gap-3 xl:grid-cols-2">
          <PageCard>
            <div class="space-y-3">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Subscribers and Destinations
              </h3>
              <div class="flex flex-wrap gap-2 text-sm">
                <span
                  v-for="(count, channel) in diagnostics.subscriberCounts ?? {}"
                  :key="channel"
                  class="rounded-md border border-ccf-300 px-2.5 py-1 dark:border-slate-700"
                >
                  {{ formatLabel(String(channel)) }}: {{ count }}
                </span>
                <span
                  v-if="Object.keys(diagnostics.subscriberCounts ?? {}).length === 0"
                  class="text-gray-600 dark:text-gray-400"
                >
                  No subscriber counts returned.
                </span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="destination in diagnosticsDestinations"
                  :key="`${destination.providerType}-${destination.destinationTarget}`"
                  class="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="destinationProviderClasses(destination.providerType)"
                  >
                    {{ getProviderLabel(destination.providerType) }}
                  </span>
                  <span class="break-all">{{ destination.destinationTarget }}</span>
                </div>
                <p
                  v-if="diagnosticsDestinations.length === 0"
                  class="text-sm text-gray-600 dark:text-gray-400"
                >
                  No system destinations returned.
                </p>
              </div>
            </div>
          </PageCard>

          <PageCard>
            <div class="space-y-3">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                Recent Job Signals
              </h3>
              <div class="grid gap-2 text-sm sm:grid-cols-2">
                <span>Source jobs: {{ diagnostics.recentJobs?.length ?? 0 }}</span>
                <span>Downstream jobs: {{ diagnostics.downstreamJobs?.length ?? 0 }}</span>
                <span>Stale jobs: {{ diagnostics.staleJobs?.length ?? 0 }}</span>
                <span>Discarded jobs: {{ diagnostics.discardedJobs?.length ?? 0 }}</span>
                <span>Retryable errors: {{ diagnostics.retryableErrors?.length ?? 0 }}</span>
                <span>
                  Next run:
                  {{ formatDate(diagnostics.nextScheduledRun?.nextRunAt) }}
                </span>
              </div>
              <div class="space-y-2 text-sm">
                <div
                  v-for="group in diagnosticJobGroups"
                  :key="group.label"
                  class="space-y-1"
                >
                  <p class="font-medium text-gray-700 dark:text-slate-300">
                    {{ group.label }}
                  </p>
                  <div
                    v-if="group.jobs.length > 0"
                    class="flex flex-wrap gap-2"
                  >
                    <button
                      v-for="job in group.jobs"
                      :key="`${group.label}-${job.id}`"
                      type="button"
                      class="font-medium text-primary hover:underline"
                      @click="
                        linkToDeliveries(
                          String(job.correlationId ?? job.sourceJobId ?? job.id),
                        )
                      "
                    >
                      {{ job.kind }} #{{ job.id }}
                    </button>
                  </div>
                  <p v-else class="text-gray-600 dark:text-gray-400">
                    None returned.
                  </p>
                </div>
              </div>
              <div
                v-if="diagnostics.recommendedActions?.length"
                class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100"
              >
                <p class="font-semibold">Recommended actions</p>
                <ul class="mt-2 list-disc space-y-1 pl-5">
                  <li
                    v-for="action in diagnostics.recommendedActions"
                    :key="action"
                  >
                    {{ action }}
                  </li>
                </ul>
              </div>
            </div>
          </PageCard>
        </div>
      </template>

      <div
        v-if="!diagnostics && !diagnosticsLoading && !diagnosticsError"
        class="rounded-lg border border-dashed border-ccf-300 bg-ccf-100 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        Select a notification type and run diagnostics.
      </div>
    </section>
  </div>

  <Dialog
    v-model:visible="showAddDestinationsDialog"
    modal
    header="Add Destination"
    size="sm"
    @hide="closeAddDestinationsDialog"
  >
    <div class="space-y-5">
      <div v-if="activeNotification" class="space-y-1">
        <p class="text-sm font-medium text-gray-900 dark:text-slate-100">
          {{ activeNotification.displayName }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Add a new destination mapping for this notification.
        </p>
      </div>

      <div class="space-y-2">
        <label
          for="destination-provider"
          class="block text-sm font-medium text-gray-900 dark:text-slate-100"
        >
          Provider
        </label>
        <select
          id="destination-provider"
          v-model="selectedProvider"
          :disabled="isCreatingDestination"
          class="w-full rounded-md border border-ccf-300 bg-white px-4 py-2 text-gray-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          @change="destinationFormError = ''"
        >
          <option
            v-for="provider in supportedProviders"
            :key="provider.value"
            :value="provider.value"
            :disabled="isProviderDisabled(provider.value)"
          >
            {{ provider.label }}
          </option>
        </select>
        <p
          v-for="reason in destinationProviderUnavailableReasons"
          :key="reason"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{ reason }}
        </p>
      </div>

      <div class="space-y-2">
        <label
          for="destination-target"
          class="block text-sm font-medium text-gray-900 dark:text-slate-100"
        >
          {{ destinationTargetLabel }}
        </label>
        <FormInput
          id="destination-target"
          v-model="destinationTarget"
          :type="selectedProvider === 'email' ? 'email' : 'text'"
          :placeholder="destinationTargetPlaceholder"
          :disabled="isCreatingDestination"
          @update:modelValue="destinationFormError = ''"
        />
      </div>

      <div
        v-if="destinationFormError"
        class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      >
        {{ destinationFormError }}
      </div>
    </div>

    <template #footer>
      <SecondaryButton
        type="button"
        :disabled="isCreatingDestination"
        @click="closeAddDestinationsDialog"
      >
        Cancel
      </SecondaryButton>
      <PrimaryButton
        type="button"
        :disabled="isCreatingDestination"
        @click="addDestination"
      >
        {{ isCreatingDestination ? 'Adding...' : 'Add Destination' }}
      </PrimaryButton>
    </template>
  </Dialog>

  <Drawer
    v-model:visible="showJobDetailDrawer"
    position="right"
    header="Delivery Job"
    class="w-full max-w-3xl"
  >
    <div class="space-y-5">
      <div
        v-if="jobDetailLoading"
        class="rounded-lg border border-ccf-300 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400"
      >
        Loading job {{ selectedJobId }}...
      </div>
      <div
        v-if="jobDetailError"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      >
        {{ jobDetailError }}
      </div>

      <template v-if="jobDetail && !jobDetailLoading">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Job {{ jobDetail.id }}
            </h3>
            <span
              class="inline-flex rounded-md border px-2 py-1 text-xs font-semibold"
              :class="statusClasses(jobDetail.state)"
            >
              {{ formatLabel(jobDetail.state) }}
            </span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Read-only delivery details. Queue mutation controls are intentionally unavailable.
          </p>
        </div>

        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Created</dt>
            <dd>{{ formatDate(jobDetail.createdAt) }}</dd>
          </div>
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Scheduled</dt>
            <dd>{{ formatDate(jobDetail.scheduledAt) }}</dd>
          </div>
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Attempted</dt>
            <dd>{{ formatDate(jobDetail.attemptedAt) }}</dd>
          </div>
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Finalized</dt>
            <dd>{{ formatDate(jobDetail.finalizedAt) }}</dd>
          </div>
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Source Job</dt>
            <dd>{{ jobDetail.sourceJobKind ?? jobDetail.metadata?.sourceJobKind ?? 'None' }} {{ jobDetail.sourceJobId ?? jobDetail.metadata?.sourceJobId ?? '' }}</dd>
          </div>
          <div>
            <dt class="font-medium text-gray-700 dark:text-slate-300">Correlation</dt>
            <dd class="break-all">{{ jobDetail.correlationId ?? jobDetail.metadata?.correlationId ?? 'None' }}</dd>
          </div>
        </dl>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
            Sanitized Args
          </h4>
          <pre class="max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{{ stringifyPayload(selectedJobDetailArgs) }}</pre>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
            Sanitized Metadata
          </h4>
          <pre class="max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{{ stringifyPayload(selectedJobDetailMetadata) }}</pre>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
            Errors
          </h4>
          <div
            v-if="(jobDetail.errors ?? []).length === 0"
            class="rounded-lg border border-dashed border-ccf-300 bg-ccf-100 p-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            No job errors returned.
          </div>
          <div
            v-for="error in jobDetail.errors"
            :key="`${error.at}-${error.attempt}`"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
          >
            <p class="font-semibold">Attempt {{ error.attempt ?? 'unknown' }} · {{ formatDate(error.at) }}</p>
            <p>{{ error.error }}</p>
          </div>
        </div>
      </template>
    </div>
  </Drawer>
</template>
