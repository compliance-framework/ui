<template>
  <template v-if="loading">
    <PageHeader>Loading preferences...</PageHeader>
  </template>
  <template v-else-if="loadError">
    <PageHeader>Error Loading Preferences</PageHeader>

    <div class="max-w-2xl mx-auto">
      <PageCard class="mb-6">
        <div class="p-6">
          <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p class="text-sm text-red-800 dark:text-red-200">
              {{ loadError }}
            </p>
            <button
              @click="loadUserData"
              class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      </PageCard>
    </div>
  </template>
  <template v-else>
    <PageHeader>User Preferences</PageHeader>

    <div class="max-w-2xl mx-auto">
      <PageCard class="mb-6">
        <div class="p-6">
          <h2
            class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Email Notifications
          </h2>

          <div class="space-y-6">
            <div class="space-y-3">
              <h3
                class="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                Evidence Notifications
              </h3>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="evidence-digest-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Evidence Digest"
                      :tooltip-text="evidenceDigestTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose where evidence digest alerts are sent
                  </p>
                </div>

                <div class="ml-4 w-48">
                  <MultiSelectDropdown
                    :options="notificationChannelOptions"
                    :model-value="evidenceDigestAlertChannels"
                    :disabled="updating"
                    placeholder="Select channels"
                    id="evidence-digest"
                    @update:model-value="onEvidenceDigestChannelsChange"
                  />
                </div>
              </div>
            </div>

            <div
              class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700"
            >
              <h3
                class="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                Task Notifications
              </h3>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="task-available-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Task Available Alerts"
                      :tooltip-text="taskAvailableTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose where task available alerts are sent
                  </p>
                </div>

                <div class="ml-4 w-48">
                  <MultiSelectDropdown
                    :options="notificationChannelOptions"
                    :model-value="taskAvailableAlertChannels"
                    :disabled="updating"
                    placeholder="Select channels"
                    id="task-available"
                    @update:model-value="onTaskAvailableChannelsChange"
                  />
                </div>
              </div>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="task-digest-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Daily Task Digest"
                      :tooltip-text="taskDailyDigestTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose where daily task digest alerts are sent
                  </p>
                </div>

                <div class="ml-4 w-48">
                  <MultiSelectDropdown
                    :options="notificationChannelOptions"
                    :model-value="taskDailyDigestAlertChannels"
                    :disabled="updating"
                    placeholder="Select channels"
                    id="task-digest"
                    @update:model-value="onTaskDailyDigestChannelsChange"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="updateError"
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <p class="text-sm text-red-800 dark:text-red-200">
              {{ updateError }}
            </p>
          </div>

          <div
            v-if="updateSuccess"
            class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <p class="text-sm text-green-800 dark:text-green-200">
              Preferences updated successfully!
            </p>
          </div>
        </div>
      </PageCard>

      <PageCard>
        <div class="p-6">
          <h2
            class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Account Information
          </h2>

          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Email:</span>
              <span class="text-gray-900 dark:text-gray-100">{{
                user?.email
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Name:</span>
              <span class="text-gray-900 dark:text-gray-100"
                >{{ user?.firstName }} {{ user?.lastName }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400"
                >Authentication Method:</span
              >
              <span class="text-gray-900 dark:text-gray-100">{{
                user?.authMethod || 'Password'
              }}</span>
            </div>
            <SlackAccountLinkSection @status-change="onSlackLinkStatusChange" />
          </div>
        </div>
      </PageCard>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import MultiSelectDropdown from '@/components/forms/MultiSelectDropdown.vue';
import SlackAccountLinkSection from '@/components/preferences/SlackAccountLinkSection.vue';

type NotificationAlertChannel = 'email' | 'slack';

const NOTIFICATION_ALERT_CHANNELS: NotificationAlertChannel[] = [
  'email',
  'slack',
];

interface NotificationSubscriptions {
  taskAvailable?: NotificationAlertChannel[];
  evidenceDigest?: NotificationAlertChannel[];
  taskDailyDigest?: NotificationAlertChannel[];
}

interface SubscriptionsPreferencesResponse {
  notifications?: NotificationSubscriptions;
  taskAvailableEmailSubscribed?: boolean;
}

interface SubscriptionsPreferencesPayload {
  notifications: {
    evidence_digest: NotificationAlertChannel[];
    task_available: NotificationAlertChannel[];
    task_daily_digest: NotificationAlertChannel[];
  };
}

interface SlackAvailabilityState {
  loading: boolean;
  configured: boolean;
  linked: boolean;
}

const normalizeNotificationChannels = (
  channels: NotificationAlertChannel[] | undefined,
): NotificationAlertChannel[] => {
  if (!channels) {
    return [];
  }

  const normalized = channels.filter(
    (channel): channel is NotificationAlertChannel =>
      typeof channel === 'string' &&
      NOTIFICATION_ALERT_CHANNELS.includes(channel as NotificationAlertChannel),
  );

  return normalized;
};

const resolveTaskAvailableChannels = (
  taskAvailableChannels: NotificationAlertChannel[],
  taskAvailableEmailSubscribed?: boolean,
): NotificationAlertChannel[] => {
  if (taskAvailableChannels.length > 0) {
    return taskAvailableChannels;
  }

  if (taskAvailableEmailSubscribed) {
    return ['email'];
  }

  return [];
};

const axios = useAuthenticatedInstance();
const user = ref<CCFUser | null>(null);
const loading = ref(true);
const updating = ref(false);
const evidenceDigestAlertChannels = ref<NotificationAlertChannel[]>([]);
const taskAvailableAlertChannels = ref<NotificationAlertChannel[]>([]);
const taskDailyDigestAlertChannels = ref<NotificationAlertChannel[]>([]);
const slackLinkConfigured = ref(false);
const slackStatusLoading = ref(true);
const isSlackLinked = ref(false);
const lastSavedPreferences = ref<SubscriptionsPreferencesPayload>({
  notifications: {
    evidence_digest: [],
    task_available: [],
    task_daily_digest: [],
  },
});
const updateError = ref<string | null>(null);
const updateSuccess = ref(false);
const loadError = ref<string | null>(null);
const successTimeoutId = ref<number | null>(null);

const canSelectSlackAlertChannel = computed(
  () =>
    !slackStatusLoading.value &&
    slackLinkConfigured.value &&
    isSlackLinked.value,
);

const sanitizeNotificationChannels = (
  channels: NotificationAlertChannel[],
): NotificationAlertChannel[] => {
  return channels.filter(
    (channel) => channel !== 'slack' || canSelectSlackAlertChannel.value,
  );
};

const notificationChannelOptions = computed<
  Array<{
    label: string;
    value: NotificationAlertChannel;
    disabled?: boolean;
    disabledTooltip?: string;
  }>
>(() => [
  { label: 'Email', value: 'email' },
  {
    label: 'Slack',
    value: 'slack',
    disabled: !canSelectSlackAlertChannel.value,
    disabledTooltip: !canSelectSlackAlertChannel.value
      ? (slackAlertUnavailableReason.value ?? undefined)
      : undefined,
  },
]);

const evidenceDigestTooltipText = computed(() =>
  evidenceDigestAlertChannels.value.length === 0
    ? 'Evidence digest alerts are turned off.'
    : 'Evidence digest alerts will be sent to your chosen channels.',
);

const taskAvailableTooltipText = computed(() => {
  return taskAvailableAlertChannels.value.length === 0
    ? 'Task available alerts are turned off.'
    : 'Task alerts will be sent to your chosen channels.';
});

const slackAlertUnavailableReason = computed(() => {
  if (slackStatusLoading.value) {
    return 'Slack alerts are unavailable until Slack link status finishes loading.';
  }

  if (!slackLinkConfigured.value) {
    return 'Slack alerts are unavailable because Slack integration is not configured for this environment.';
  }

  if (!isSlackLinked.value) {
    return 'Link your Slack account below to enable Slack alerts.';
  }

  return null;
});

const taskDailyDigestTooltipText = computed(() =>
  taskDailyDigestAlertChannels.value.length === 0
    ? 'Daily task digest alerts are turned off.'
    : 'Daily task digest alerts will be sent to your chosen channels.',
);

// Load user data and subscriptions
const loadUserData = async () => {
  try {
    // Get current user info
    const userResponse = await axios.get<{ data: CCFUser }>('/api/users/me');
    user.value = userResponse.data.data;

    // Get subscriptions status
    const subscriptionResponse = await axios.get<{
      data: SubscriptionsPreferencesResponse;
    }>('/api/users/me/subscriptions');

    const evidenceDigestChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.evidenceDigest,
    );

    evidenceDigestAlertChannels.value = evidenceDigestChannels;

    const taskAvailableChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.taskAvailable,
    );

    taskAvailableAlertChannels.value = resolveTaskAvailableChannels(
      taskAvailableChannels,
      subscriptionResponse.data.data.taskAvailableEmailSubscribed,
    );

    const taskDailyDigestChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.taskDailyDigest,
    );

    taskDailyDigestAlertChannels.value = taskDailyDigestChannels;

    lastSavedPreferences.value = {
      notifications: {
        evidence_digest: [...evidenceDigestAlertChannels.value],
        task_available: [...taskAvailableAlertChannels.value],
        task_daily_digest: [...taskDailyDigestAlertChannels.value],
      },
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    loadError.value =
      'Failed to load preferences. Please refresh the page to try again.';
  } finally {
    loading.value = false;
  }
};

const onEvidenceDigestChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  evidenceDigestAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateEmailPreferences();
};

const onTaskAvailableChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  taskAvailableAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateEmailPreferences();
};

const onTaskDailyDigestChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  taskDailyDigestAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateEmailPreferences();
};

const onSlackLinkStatusChange = (state: SlackAvailabilityState) => {
  slackStatusLoading.value = state.loading;
  slackLinkConfigured.value = state.configured;
  isSlackLinked.value = state.linked;
};

// Update email preferences
const updateEmailPreferences = async () => {
  updating.value = true;
  updateError.value = null;
  updateSuccess.value = false;

  try {
    const persistedEvidenceDigestChannels = sanitizeNotificationChannels(
      evidenceDigestAlertChannels.value,
    );
    const persistedTaskAvailableChannels = sanitizeNotificationChannels(
      taskAvailableAlertChannels.value,
    );
    const persistedTaskDailyDigestChannels = sanitizeNotificationChannels(
      taskDailyDigestAlertChannels.value,
    );
    await axios.put('/api/users/me/subscriptions', {
      notifications: {
        evidence_digest: persistedEvidenceDigestChannels,
        task_available: persistedTaskAvailableChannels,
        task_daily_digest: persistedTaskDailyDigestChannels,
      },
    });

    lastSavedPreferences.value = {
      notifications: {
        evidence_digest: persistedEvidenceDigestChannels,
        task_available: persistedTaskAvailableChannels,
        task_daily_digest: persistedTaskDailyDigestChannels,
      },
    };

    if (successTimeoutId.value) {
      clearTimeout(successTimeoutId.value);
    }

    updateSuccess.value = true;
    // Hide success message after 3 seconds
    successTimeoutId.value = window.setTimeout(() => {
      updateSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error updating email preferences:', error);
    updateError.value = 'Failed to update preferences. Please try again.';

    // Revert to previous values on error
    evidenceDigestAlertChannels.value = [
      ...lastSavedPreferences.value.notifications.evidence_digest,
    ];
    taskAvailableAlertChannels.value = [
      ...lastSavedPreferences.value.notifications.task_available,
    ];
    taskDailyDigestAlertChannels.value = [
      ...lastSavedPreferences.value.notifications.task_daily_digest,
    ];
  } finally {
    updating.value = false;
  }
};

onMounted(() => {
  loadUserData();
});

onUnmounted(() => {
  if (successTimeoutId.value) {
    clearTimeout(successTimeoutId.value);
  }
});
</script>
