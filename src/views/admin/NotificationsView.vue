<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
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

const canSelectSlackDestination = computed(
  () =>
    !slackDestinationStatusLoading.value && slackDestinationConfigured.value,
);

const slackDestinationUnavailableReason = computed(() => {
  if (slackDestinationStatusLoading.value) {
    return 'Slack destinations are unavailable until Slack configuration finishes loading.';
  }

  if (!slackDestinationConfigured.value) {
    return 'Slack destinations are unavailable because Slack integration is not configured for this environment.';
  }

  return null;
});

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getProviderLabel(provider: NotificationDestinationProvider): string {
  return (
    supportedProviders.find((option) => option.value === provider)?.label ??
    provider
  );
}

function destinationProviderClasses(
  provider: NotificationDestinationProvider,
): string {
  switch (provider) {
    case 'slack':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'email':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
    default:
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function getDefaultDestinationProvider(): NotificationDestinationProvider {
  return canSelectSlackDestination.value ? 'slack' : 'email';
}

function isProviderDisabled(
  provider: NotificationDestinationProvider,
): boolean {
  return provider === 'slack' && !canSelectSlackDestination.value;
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
  const axiosError = error as AxiosError<ErrorResponse<ErrorBody>>;
  return axiosError.response?.data?.errors?.body || fallbackMessage;
}

async function loadSlackDestinationStatus() {
  slackDestinationStatusLoading.value = true;

  try {
    await axios.get('/api/auth/slack/link/status');
    slackDestinationConfigured.value = true;
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;

    if (errorResponse.response?.status === 404) {
      slackDestinationConfigured.value = false;
      return;
    }

    slackDestinationConfigured.value = true;
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

  if (selectedProvider.value === 'email' && !isValidEmail(trimmedTarget)) {
    destinationFormError.value = 'Enter a valid email address.';
    return;
  }

  if (selectedProvider.value === 'slack' && !canSelectSlackDestination.value) {
    destinationFormError.value =
      slackDestinationUnavailableReason.value ||
      'Slack destinations are currently unavailable.';
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

watch(canSelectSlackDestination, (canSelectSlack) => {
  if (canSelectSlack || selectedProvider.value !== 'slack') {
    return;
  }

  selectedProvider.value = 'email';
});

onMounted(() => {
  void loadSlackDestinationStatus();
});
</script>

<template>
  <PageHeader> Notifications </PageHeader>

  <div class="mt-8 space-y-6">
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
          v-if="!canSelectSlackDestination"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{ slackDestinationUnavailableReason }}
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
