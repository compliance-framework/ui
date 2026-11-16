<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import {
  decamelizeKeys,
  useAuthenticatedInstance,
  useDataApi,
} from '@/composables/axios';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import NotificationCheckResults from './NotificationCheckResults.vue';
import NotificationHealthSection from './NotificationHealthSection.vue';
import NotificationJobDetail from './NotificationJobDetail.vue';
import {
  diagnosticsNotificationOptions,
  formatDate,
  formatLabel,
  formatMetadataLabel,
  formatNotificationName,
  getApiErrorMessage,
  getProviderLabel,
  notificationDefinitions,
  notificationFilterOptions,
  providerFilterOptions,
  queueOptions,
  sinceForRange,
  stateOptions,
  statusBadge,
  supportedProviders,
  timeRangeOptions,
  type NotificationConfigurationResponse,
  type NotificationDestinationPayload,
  type NotificationDestinationProvider,
  type NotificationDestinationResponse,
  type NotificationDiagnosticsResponse,
  type NotificationHealthResponse,
  type NotificationHealthWarning,
  type NotificationJob,
  type NotificationJobDetail as NotificationJobDetailData,
  type NotificationJobsResponse,
  type NotificationProviderInfo,
  type NotificationTestResponse,
  type PredeterminedNotification,
} from './notificationDiagnostics';

/**
 * Diagnostics > Notifications (/admin/diagnostics/notifications, admin): provider readiness and
 * destinations, queue health, delivery jobs and per-notification checks. The four sections are
 * in-page tabs kept in the address (?tab=health), like other in-page tabs; Health, Deliveries and
 * Diagnostics load the first time they are opened.
 */
const notificationTabs = [
  { value: 'configuration', label: 'Configuration' },
  { value: 'health', label: 'Health' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'diagnostics', label: 'Diagnostics' },
] as const;
type NotificationTab = (typeof notificationTabs)[number]['value'];

const toast = useToast();
const axios = useAuthenticatedInstance();
const route = useRoute();
const router = useRouter();

const activeTab = computed<NotificationTab>(
  () =>
    notificationTabs.find((tab) => tab.value === route.query.tab)?.value ??
    'configuration',
);
const tabs = notificationTabs.map((tab) => ({
  label: tab.label,
  to: { query: tab.value === 'configuration' ? {} : { tab: tab.value } },
}));

const showAddDestinationsDialog = ref(false);
const activeNotificationName = ref<string | null>(null);
const selectedProvider = ref<NotificationDestinationProvider>('slack');
const destinationTarget = ref('');
const destinationFormError = ref('');
const health = ref<NotificationHealthResponse | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);
const jobs = ref<NotificationJob[]>([]);
const jobsNextCursor = ref<string | null>(null);
const jobsLoading = ref(false);
const jobsError = ref<string | null>(null);
const jobsPaginationError = ref<string | null>(null);
const jobDetail = ref<NotificationJobDetailData | null>(null);
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
const testSendLoadingKeys = ref<Set<string>>(new Set());
const hasLoadedHealth = ref(false);
const hasLoadedJobs = ref(false);
let autoRefreshTimer: number | undefined;
let jobsSearchDebounceTimer: number | undefined;
let healthRequestSequence = 0;
let jobsRequestSequence = 0;
let jobDetailRequestSequence = 0;
let diagnosticsRequestSequence = 0;
const testSendRequestSequences = new Map<string, number>();

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
  const providers = notificationProviders.value ?? [];

  return providers.length > 0 ? providers : (health.value?.providers ?? []);
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

const destinationTargetLabel = computed(() => {
  return selectedProvider.value === 'email' ? 'Email address' : 'Channel';
});

const destinationTargetPlaceholder = computed(() => {
  return selectedProvider.value === 'email'
    ? 'team@example.com'
    : 'my-slack-channel';
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

/** The provider choices for the Select, with unavailable providers disabled. */
const providerSelectOptions = computed(() =>
  supportedProviders.map((provider) => ({
    value: provider.value,
    label: provider.label,
    disabled: isProviderDisabled(provider.value),
  })),
);

/** Select works on strings; the dialog keeps the provider type. */
const providerModel = computed({
  get: () => selectedProvider.value,
  set: (value: string) => {
    selectedProvider.value = value as NotificationDestinationProvider;
    destinationFormError.value = '';
  },
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
  const warnings: NotificationHealthWarning[] = [
    ...(health.value?.warnings ?? []),
  ];

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

  for (const queue of healthQueues.value) {
    if ((queue.staleCount ?? 0) > 0) {
      warnings.push({
        code: `stale_${queue.name}`,
        severity: 'warning',
        message: `${queue.name} queue has ${queue.staleCount} stale job${queue.staleCount === 1 ? '' : 's'}.`,
        target: queue.name,
      });
    }

    if ((queue.discarded24H ?? 0) > 0) {
      warnings.push({
        code: `discarded_${queue.name}`,
        severity: 'warning',
        message: `${queue.name} queue has ${queue.discarded24H} discarded job${queue.discarded24H === 1 ? '' : 's'} in the last 24 hours.`,
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

const jobsStatus = computed<QueryStatus>(() => {
  if (jobsError.value) return 'error';
  if (!hasLoadedJobs.value || (jobsLoading.value && jobs.value.length === 0))
    return 'loading';
  return filteredJobs.value.length > 0 ? 'ready' : 'empty';
});

const jobsSummary = computed(() =>
  hasLoadedJobs.value && !jobsError.value
    ? `${plural(filteredJobs.value.length, 'delivery job')} shown`
    : '',
);

const jobColumns: DataTableColumn[] = [
  { key: 'id', label: 'Job ID', nowrap: true },
  { key: 'createdAt', label: 'Created', nowrap: true },
  { key: 'notificationKind', label: 'Notification', minWidth: 'sm' },
  { key: 'provider', label: 'Provider' },
  { key: 'queue', label: 'Queue' },
  { key: 'kind', label: 'Kind' },
  { key: 'state', label: 'State', nowrap: true },
  { key: 'attempts', label: 'Attempts', align: 'end' },
  { key: 'target', label: 'Target', minWidth: 'sm' },
  { key: 'lastError', label: 'Last error', minWidth: 'md' },
];

const destinationColumns: DataTableColumn[] = [
  { key: 'target', label: 'Destination', minWidth: 'sm' },
  { key: 'provider', label: 'Provider' },
];

const diagnosticsHealthNotification = computed(() => {
  const notificationName = diagnostics.value?.notificationName;

  if (!notificationName) {
    return undefined;
  }

  return healthNotifications.value.find(
    (notification) => notification.name === notificationName,
  );
});
const diagnosticsSubscriberCounts = computed(() => {
  return (
    diagnostics.value?.subscriberCounts ??
    diagnosticsHealthNotification.value?.subscriberCounts ??
    {}
  );
});
const diagnosticsDestinations = computed(() => {
  return (
    diagnostics.value?.systemDestinations ??
    diagnostics.value?.destinations ??
    diagnostics.value?.configuredDestinations ??
    diagnosticsHealthNotification.value?.configuredDestinations ??
    []
  );
});

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

function buildJobsParams(cursor?: string) {
  const jobIdOrCorrelation = jobIdOrCorrelationFilter.value.trim();

  return {
    queue: selectedQueueFilter.value || undefined,
    provider: selectedProviderFilter.value || undefined,
    notificationKind: selectedNotificationFilter.value || undefined,
    state: selectedStateFilter.value || undefined,
    jobIdOrCorrelation: jobIdOrCorrelation || undefined,
    since: sinceForRange(selectedTimeRange.value),
    limit: 50,
    cursor,
  };
}

async function loadHealth() {
  const requestSequence = ++healthRequestSequence;
  healthLoading.value = true;
  healthError.value = null;

  try {
    const response = await axios.get<{ data: NotificationHealthResponse }>(
      '/api/admin/notifications/health',
    );

    if (requestSequence !== healthRequestSequence) {
      return;
    }

    health.value = response.data.data;
  } catch (error) {
    if (requestSequence !== healthRequestSequence) {
      return;
    }

    health.value = null;
    healthError.value = getApiErrorMessage(
      error,
      'Notification health is unavailable.',
    );
  } finally {
    if (requestSequence === healthRequestSequence) {
      hasLoadedHealth.value = true;
      healthLoading.value = false;
    }
  }
}

async function loadJobs(cursor?: string) {
  const requestSequence = ++jobsRequestSequence;
  jobsLoading.value = true;

  if (cursor) {
    jobsPaginationError.value = null;
  } else {
    jobsError.value = null;
    jobsPaginationError.value = null;
    jobsNextCursor.value = null;
  }

  try {
    const response = await axios.get<NotificationJobsResponse>(
      '/api/admin/notifications/jobs',
      {
        params: buildJobsParams(cursor),
      },
    );
    if (requestSequence !== jobsRequestSequence) {
      return;
    }

    const nextJobs = response.data.data ?? [];
    jobs.value = cursor ? [...jobs.value, ...nextJobs] : nextJobs;
    jobsNextCursor.value = response.data.pagination?.nextCursor ?? null;
  } catch (error) {
    if (requestSequence !== jobsRequestSequence) {
      return;
    }

    if (cursor) {
      jobsPaginationError.value = getApiErrorMessage(
        error,
        'More notification delivery jobs are unavailable.',
      );
    } else {
      jobs.value = [];
      jobsNextCursor.value = null;
      jobsError.value = getApiErrorMessage(
        error,
        'Notification delivery jobs are unavailable.',
      );
    }
  } finally {
    if (requestSequence === jobsRequestSequence) {
      hasLoadedJobs.value = true;
      jobsLoading.value = false;
    }
  }
}

async function openJobDetail(job: Pick<NotificationJob, 'id'>) {
  selectedJobId.value = job.id;
  const requestedJobId = job.id;
  const requestSequence = ++jobDetailRequestSequence;
  showJobDetailDrawer.value = true;
  jobDetailLoading.value = true;
  jobDetailError.value = null;
  jobDetail.value = null;

  try {
    const response = await axios.get<{ data: NotificationJobDetailData }>(
      `/api/admin/notifications/jobs/${encodeURIComponent(String(job.id))}`,
    );
    if (
      requestSequence !== jobDetailRequestSequence ||
      selectedJobId.value !== requestedJobId
    ) {
      return;
    }

    jobDetail.value = response.data.data;
  } catch (error) {
    if (
      requestSequence !== jobDetailRequestSequence ||
      selectedJobId.value !== requestedJobId
    ) {
      return;
    }

    jobDetailError.value = getApiErrorMessage(
      error,
      'Notification job details are unavailable.',
    );
  } finally {
    if (
      requestSequence === jobDetailRequestSequence &&
      selectedJobId.value === requestedJobId
    ) {
      jobDetailLoading.value = false;
    }
  }
}

function retryJobDetail() {
  if (selectedJobId.value !== null) {
    void openJobDetail({ id: selectedJobId.value });
  }
}

async function loadDiagnostics() {
  const requestSequence = ++diagnosticsRequestSequence;
  const notificationName = diagnosticsNotificationName.value;
  diagnosticsLoading.value = true;
  diagnosticsError.value = null;
  diagnostics.value = null;

  try {
    const response = await axios.get<{ data: NotificationDiagnosticsResponse }>(
      `/api/admin/notifications/${encodeURIComponent(notificationName)}/diagnostics`,
    );
    if (
      requestSequence !== diagnosticsRequestSequence ||
      diagnosticsNotificationName.value !== notificationName
    ) {
      return;
    }

    diagnostics.value = response.data.data;
  } catch (error) {
    if (
      requestSequence !== diagnosticsRequestSequence ||
      diagnosticsNotificationName.value !== notificationName
    ) {
      return;
    }

    diagnosticsError.value = getApiErrorMessage(
      error,
      'Notification diagnostics are unavailable.',
    );
  } finally {
    if (
      requestSequence === diagnosticsRequestSequence &&
      diagnosticsNotificationName.value === notificationName
    ) {
      diagnosticsLoading.value = false;
    }
  }
}

async function sendTestNotification(
  providerType: NotificationDestinationProvider,
  destinationTarget: string,
) {
  const key = `${providerType}:${destinationTarget}`;
  const requestSequence = (testSendRequestSequences.get(key) ?? 0) + 1;
  testSendRequestSequences.set(key, requestSequence);
  testSendLoadingKeys.value = new Set(testSendLoadingKeys.value).add(key);

  try {
    const response = await axios.post<{ data: NotificationTestResponse }>(
      '/api/admin/notifications/test',
      {
        providerType,
        destinationTarget,
        mode: 'enqueue',
      },
    );
    if (testSendRequestSequences.get(key) !== requestSequence) {
      return;
    }

    const message = response.data.data.message ?? 'Test notification accepted.';
    toast.add({
      severity: 'success',
      summary: 'Test notification sent',
      detail: message,
      life: 3000,
    });
  } catch (error) {
    if (testSendRequestSequences.get(key) !== requestSequence) {
      return;
    }

    const message = getApiErrorMessage(
      error,
      'Test notification endpoint is unavailable.',
    );
    toast.add({
      severity: 'error',
      summary: "Couldn't send the test notification",
      detail: message,
      life: 4000,
    });
  } finally {
    if (testSendRequestSequences.get(key) === requestSequence) {
      const nextLoadingKeys = new Set(testSendLoadingKeys.value);
      nextLoadingKeys.delete(key);
      testSendLoadingKeys.value = nextLoadingKeys;
    }
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

/** Only one removal runs at a time; the others say why they wait. */
function removeDisabledReason(
  notificationName: string,
  provider: NotificationDestinationProvider,
  target: string,
): string | undefined {
  return isDeletingDestination.value &&
    !isDestinationBeingDeleted(notificationName, provider, target)
    ? 'Another destination is being removed. Try again when it finishes.'
    : undefined;
}

function isTestSendLoading(
  provider: NotificationDestinationProvider,
  target: string,
): boolean {
  return testSendLoadingKeys.value.has(`${provider}:${target}`);
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

function onDestinationDialogOpen(open: boolean) {
  if (!open) {
    closeAddDestinationsDialog();
  }
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
      summary: 'Destination added',
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
      summary: "Couldn't add the destination",
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
      summary: 'Destination removed',
      detail: `${getProviderLabel(provider)} destination removed successfully.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "Couldn't remove the destination",
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

function clearJobsSearchDebounceTimer() {
  if (jobsSearchDebounceTimer) {
    window.clearTimeout(jobsSearchDebounceTimer);
    jobsSearchDebounceTimer = undefined;
  }
}

function queueJobSearchReload() {
  clearJobsSearchDebounceTimer();

  jobsSearchDebounceTimer = window.setTimeout(() => {
    jobsSearchDebounceTimer = undefined;

    if (activeTab.value !== 'deliveries') {
      return;
    }

    void loadJobs();
  }, 300);
}

function searchJobs() {
  clearJobsSearchDebounceTimer();
  applyJobFilters();
}

function linkToDeliveries(filter: string) {
  jobIdOrCorrelationFilter.value = filter;
  const alreadyLoaded = hasLoadedJobs.value;
  void router.push({ query: { ...route.query, tab: 'deliveries' } });

  if (alreadyLoaded) {
    void loadJobs();
  }
}

function stopAutoRefreshJobsTimer() {
  if (!autoRefreshTimer) {
    return;
  }

  window.clearInterval(autoRefreshTimer);
  autoRefreshTimer = undefined;
}

function startAutoRefreshJobsTimer() {
  stopAutoRefreshJobsTimer();

  if (!autoRefreshJobs.value || activeTab.value !== 'deliveries') {
    return;
  }

  autoRefreshTimer = window.setInterval(() => {
    if (activeTab.value !== 'deliveries' || jobsLoading.value) {
      return;
    }

    void loadJobs();
  }, 30000);
}

function ensureActiveTabDataLoaded(tab: NotificationTab) {
  if (tab === 'health' && !hasLoadedHealth.value && !healthLoading.value) {
    void loadHealth();
    return;
  }

  if (tab === 'deliveries' && !hasLoadedJobs.value && !jobsLoading.value) {
    void loadJobs();
    return;
  }

  if (
    tab === 'diagnostics' &&
    !diagnostics.value &&
    !diagnosticsLoading.value
  ) {
    void loadDiagnostics();
  }
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

// The select filters apply as soon as one changes; the search applies on Enter or after a pause.
watch(
  [
    selectedNotificationFilter,
    selectedProviderFilter,
    selectedQueueFilter,
    selectedStateFilter,
    selectedTimeRange,
  ],
  applyJobFilters,
);

// Immediate, so a link straight to ?tab=health loads that section.
watch(
  activeTab,
  (tab) => {
    ensureActiveTabDataLoaded(tab);

    if (tab === 'deliveries') {
      startAutoRefreshJobsTimer();
    } else {
      stopAutoRefreshJobsTimer();
      clearJobsSearchDebounceTimer();
    }
  },
  { immediate: true },
);

watch(autoRefreshJobs, () => {
  startAutoRefreshJobsTimer();
});

onUnmounted(() => {
  stopAutoRefreshJobsTimer();
  clearJobsSearchDebounceTimer();
});
</script>

<template>
  <Tabs label="Notification diagnostics: sections" :tabs="tabs">
    <Stack v-if="activeTab === 'configuration'" gap="section">
      <Panel
        title="Providers"
        description="Provider readiness for system notifications."
      >
        <DataState
          :status="
            providersError
              ? 'error'
              : isLoadingProviders
                ? 'loading'
                : providerList.length > 0
                  ? 'ready'
                  : 'empty'
          "
          subject="notification providers"
          empty-title="No providers configured yet"
          :error-message="
            getApiErrorMessage(
              providersError,
              'Failed to load notification providers.',
            )
          "
          skeleton="panel"
          :heading-level="3"
          @retry="loadProviders()"
        >
          <PanelSection
            v-for="provider in providerList"
            :key="provider.providerType"
            :title="
              provider.displayName || getProviderLabel(provider.providerType)
            "
          >
            <template #actions>
              <StatusBadge
                :status="
                  provider.enabled ? 'provider-enabled' : 'provider-disabled'
                "
              />
            </template>
            <Stack gap="3">
              <Cluster gap="2">
                <Tag :label="provider.providerType" />
                <Text as="span" variant="secondary">{{
                  provider.description
                }}</Text>
              </Cluster>
              <InlineMessage
                v-if="provider.error"
                tone="error"
                title="This provider is misconfigured"
              >
                {{ provider.error }}
              </InlineMessage>
              <DescriptionList
                v-else-if="getProviderMetadataEntries(provider).length > 0"
                :items="getProviderMetadataEntries(provider)"
              />
            </Stack>
          </PanelSection>
        </DataState>
      </Panel>

      <Panel
        title="Notifications"
        description="Where each system notification is sent."
      >
        <DataState
          :status="
            notificationsError
              ? 'error'
              : isLoadingNotifications
                ? 'loading'
                : 'ready'
          "
          subject="notification configuration"
          :error-message="
            getApiErrorMessage(
              notificationsError,
              'Failed to load notifications.',
            )
          "
          skeleton="panel"
          :heading-level="3"
          @retry="loadNotifications()"
        >
          <PanelSection
            v-for="notification in predeterminedNotifications"
            :key="notification.name"
            :title="notification.displayName"
            :description="notification.description"
          >
            <template #actions>
              <Button
                icon="add"
                @click="openAddDestinationsDialog(notification.name)"
                >Add destination</Button
              >
            </template>
            <DataTable
              v-if="notification.configuredDestinations.length > 0"
              :caption="`Destinations for ${notification.displayName}`"
              caption-hidden
              :columns="destinationColumns"
              :rows="notification.configuredDestinations"
              :row-key="
                (destination) =>
                  `${notification.name}-${destination.provider}-${destination.target}`
              "
            >
              <template #cell-provider="{ row }">
                <Tag :label="getProviderLabel(row.provider)" />
              </template>
              <template #actions="{ row }">
                <Cluster gap="2" justify="end">
                  <Button
                    size="sm"
                    :aria-label="`Send a test notification to ${row.target}`"
                    :loading="isTestSendLoading(row.provider, row.target)"
                    @click="sendTestNotification(row.provider, row.target)"
                    >Send test notification</Button
                  >
                  <Button
                    size="sm"
                    variant="danger"
                    :aria-label="`Remove ${row.target}`"
                    :loading="
                      isDestinationBeingDeleted(
                        notification.name,
                        row.provider,
                        row.target,
                      )
                    "
                    :disabled-reason="
                      removeDisabledReason(
                        notification.name,
                        row.provider,
                        row.target,
                      )
                    "
                    @click="
                      removeDestination(
                        notification.name,
                        row.provider,
                        row.target,
                      )
                    "
                    >Remove</Button
                  >
                </Cluster>
              </template>
            </DataTable>
            <Text v-else variant="secondary"
              >No destinations configured yet.</Text
            >
          </PanelSection>
        </DataState>
      </Panel>
    </Stack>

    <NotificationHealthSection
      v-else-if="activeTab === 'health'"
      :loading="healthLoading || !hasLoadedHealth"
      :error="healthError"
      :health="health"
      :worker-mode-label="workerModeLabel"
      :providers="providerList"
      :queues="healthQueues"
      :notifications="healthNotifications"
      :schedules="healthSchedules"
      :warnings="healthWarnings"
      @refresh="loadHealth"
      @open-deliveries="linkToDeliveries"
    />

    <Panel
      v-else-if="activeTab === 'deliveries'"
      title="Deliveries"
      description="River notification jobs are read-only here. No retry, discard, cancel, or edit actions are available."
    >
      <template #actions>
        <Checkbox v-model="autoRefreshJobs" label="Auto-refresh every 30s" />
        <Button icon="refresh" :loading="jobsLoading" @click="loadJobs()"
          >Refresh</Button
        >
      </template>
      <Stack gap="4">
        <FilterBar
          v-model:query="jobIdOrCorrelationFilter"
          label="Filter deliveries"
          search-label="Job or correlation"
          search-placeholder="Filter loaded jobs"
          :summary="jobsSummary"
          @update:query="queueJobSearchReload"
          @search="searchJobs"
        >
          <FormField label="Notification">
            <Select
              v-model="selectedNotificationFilter"
              :options="notificationFilterOptions"
              placeholder="All notifications"
            />
          </FormField>
          <FormField label="Provider">
            <Select
              v-model="selectedProviderFilter"
              :options="
                providerFilterOptions.map((provider) => ({
                  value: provider,
                  label: getProviderLabel(provider),
                }))
              "
              placeholder="All providers"
            />
          </FormField>
          <FormField label="Queue">
            <Select
              v-model="selectedQueueFilter"
              :options="
                queueOptions.map((queue) => ({ value: queue, label: queue }))
              "
              placeholder="All queues"
            />
          </FormField>
          <FormField label="State">
            <Select
              v-model="selectedStateFilter"
              :options="
                stateOptions.map((state) => ({
                  value: state,
                  label: formatLabel(state),
                }))
              "
              placeholder="All states"
            />
          </FormField>
          <FormField label="Time range">
            <Select v-model="selectedTimeRange" :options="timeRangeOptions" />
          </FormField>
        </FilterBar>

        <DataState
          :status="jobsStatus"
          subject="delivery jobs"
          empty-title="No notification delivery jobs match the current filters"
          :error-message="jobsError ?? undefined"
          :heading-level="3"
          @retry="loadJobs()"
        >
          <Stack gap="4">
            <DataTable
              caption="Delivery jobs"
              caption-hidden
              :columns="jobColumns"
              :rows="filteredJobs"
              :row-key="(job) => String(job.id)"
            >
              <template #cell-id="{ row }">
                <Button
                  variant="tertiary"
                  size="sm"
                  :aria-label="`Open job ${row.id}`"
                  @click="openJobDetail(row)"
                  >{{ row.id }}</Button
                >
              </template>
              <template #cell-createdAt="{ row }">{{
                formatDate(row.createdAt)
              }}</template>
              <template #cell-notificationKind="{ row }">{{
                formatNotificationName(row.notificationKind)
              }}</template>
              <template #cell-provider="{ row }">{{
                getProviderLabel(row.provider ?? '')
              }}</template>
              <template #cell-state="{ row }">
                <StatusBadge v-bind="statusBadge(row.state, row.stale)" />
              </template>
              <template #cell-attempts="{ row }"
                >{{ row.attempt ?? 0 }}/{{ row.maxAttempts ?? 0 }}</template
              >
              <template #cell-target="{ row }">{{
                row.target ?? 'None'
              }}</template>
              <template #cell-lastError="{ row }">{{
                row.lastError ?? 'None'
              }}</template>
            </DataTable>
            <Cluster v-if="jobsNextCursor">
              <Button
                :loading="jobsLoading"
                @click="loadJobs(jobsNextCursor ?? undefined)"
                >Load more</Button
              >
            </Cluster>
            <InlineMessage
              v-if="jobsPaginationError"
              tone="error"
              title="We couldn't load more delivery jobs."
            >
              {{ jobsPaginationError }}
            </InlineMessage>
          </Stack>
        </DataState>
      </Stack>
    </Panel>

    <Stack v-else gap="section">
      <Panel
        title="Diagnostics"
        description="Read-only checks for evidence digest, workflow, risk, and POAM notifications."
      >
        <Cluster align="end">
          <FormField label="Notification type">
            <Select
              v-model="diagnosticsNotificationName"
              :options="diagnosticsNotificationOptions"
            />
          </FormField>
          <Button
            icon="refresh"
            :loading="diagnosticsLoading"
            @click="loadDiagnostics"
            >Run diagnostics</Button
          >
        </Cluster>
      </Panel>

      <DataState
        :status="
          diagnosticsError
            ? 'error'
            : diagnosticsLoading
              ? 'loading'
              : diagnostics
                ? 'ready'
                : 'empty'
        "
        subject="notification diagnostics"
        empty-title="No diagnostics run yet"
        empty-body="Select a notification type and run diagnostics."
        :error-message="diagnosticsError ?? undefined"
        skeleton="panel"
        @retry="loadDiagnostics"
      >
        <NotificationCheckResults
          v-if="diagnostics"
          :diagnostics="diagnostics"
          :subscriber-counts="diagnosticsSubscriberCounts"
          :destinations="diagnosticsDestinations"
          @open-deliveries="linkToDeliveries"
        />
      </DataState>
    </Stack>
  </Tabs>

  <Dialog
    :open="showAddDestinationsDialog"
    title="Add destination"
    :description="
      activeNotification
        ? `Add a new destination mapping for ${activeNotification.displayName}.`
        : undefined
    "
    size="s"
    @update:open="onDestinationDialogOpen"
  >
    <Stack gap="4">
      <FormField
        label="Provider"
        :hint="destinationProviderUnavailableReasons.join(' ') || undefined"
      >
        <Select
          v-model="providerModel"
          data-testid="destination-provider"
          :options="providerSelectOptions"
          :disabled="isCreatingDestination"
        />
      </FormField>
      <FormField :label="destinationTargetLabel" required>
        <TextInput
          v-model="destinationTarget"
          data-testid="destination-target"
          :type="selectedProvider === 'email' ? 'email' : 'text'"
          :placeholder="destinationTargetPlaceholder"
          :disabled="isCreatingDestination"
          @update:model-value="destinationFormError = ''"
        />
      </FormField>
      <InlineMessage
        v-if="destinationFormError"
        tone="error"
        title="The destination wasn't added"
      >
        {{ destinationFormError }}
      </InlineMessage>
    </Stack>
    <template #footer>
      <Button variant="tertiary" @click="closeAddDestinationsDialog"
        >Cancel</Button
      >
      <Button
        variant="primary"
        :loading="isCreatingDestination"
        @click="addDestination"
        >Add destination</Button
      >
    </template>
  </Dialog>

  <Drawer v-model:open="showJobDetailDrawer" title="Delivery job">
    <DataState
      :status="
        jobDetailError
          ? 'error'
          : jobDetailLoading || !jobDetail
            ? 'loading'
            : 'ready'
      "
      :subject="`job ${selectedJobId}`"
      :error-message="jobDetailError ?? undefined"
      skeleton="panel"
      :heading-level="3"
      @retry="retryJobDetail"
    >
      <NotificationJobDetail v-if="jobDetail" :job="jobDetail" />
    </DataState>
  </Drawer>
</template>
