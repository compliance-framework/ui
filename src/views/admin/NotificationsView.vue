<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
import FormInput from '@/components/forms/FormInput.vue';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

type NotificationDestinationProvider = 'slack' | 'email';

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

const toast = useToast();
const axios = useAuthenticatedInstance();
const supportedProviders: Array<{
  label: string;
  value: NotificationDestinationProvider;
}> = [
  { label: 'Slack', value: 'slack' },
  { label: 'Email', value: 'email' },
];
const showAddDestinationsDialog = ref(false);
const activeNotificationName = ref<string | null>(null);
const selectedProvider = ref<NotificationDestinationProvider>('slack');
const destinationTarget = ref('');
const destinationFormError = ref('');
const slackDestinationStatusLoading = ref(true);
const slackDestinationConfigured = ref(false);
const slackDestinationStatusError = ref<string | null>(null);

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
  return notificationProviders.value ?? [];
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

function getProviderLabel(provider: NotificationDestinationProvider): string {
  return (
    supportedProviders.find((option) => option.value === provider)?.label ??
    provider
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

function formatMetadataLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

watch(selectableDestinationProviders, () => {
  if (!isProviderDisabled(selectedProvider.value)) {
    return;
  }

  selectedProvider.value = getDefaultDestinationProvider();
});

onMounted(() => {
  void loadSlackDestinationStatus();
});
</script>

<template>
  <PageHeader> Notifications </PageHeader>

  <div class="mt-8 space-y-6">
    <section aria-labelledby="providers-heading" class="space-y-4">
      <div>
        <h2
          id="providers-heading"
          class="text-2xl font-semibold text-gray-900 dark:text-white"
        >
          Providers
        </h2>
        <p class="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">
          Review configured notification providers.
        </p>
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
            <div class="flex h-full min-h-44 flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <h3
                  class="text-base font-semibold text-gray-900 dark:text-white"
                >
                  <span
                    class="inline-flex w-fit min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold uppercase tracking-[0.08em]"
                    :class="destinationProviderClasses(provider.providerType)"
                  >
                    {{ provider.providerType }}
                  </span>
                </h3>
                <span
                  class="inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold"
                  :class="
                    provider.enabled
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
        <h2
          id="notifications-heading"
          class="text-2xl font-semibold text-gray-900 dark:text-white"
        >
          Notifications
        </h2>
        <p class="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">
          Configure each notification for what destinations you wish to receive
          them at.
        </p>
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
              <div class="space-y-2">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ notification.displayName }}
                </h3>
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
                  class="flex flex-col gap-2 bg-white px-4 py-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="destinationProviderClasses(destination.provider)"
                    >
                      {{ getProviderLabel(destination.provider) }}
                    </span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                      {{ destination.target }}
                    </span>
                  </div>

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
          @change="destinationFormError = ''"
          :disabled="isCreatingDestination"
          class="w-full rounded-md border border-ccf-300 bg-white px-4 py-2 text-gray-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
</template>
