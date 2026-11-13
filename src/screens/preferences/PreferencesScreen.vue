<script setup lang="ts">
/**
 * Preferences (/preferences): where each kind of notification is sent (email, Slack), and the
 * signed-in account. The Slack link section is the classic one (a legacy island). The script is
 * the classic page's; the template and the helpers at the end are new.
 */
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';
import SlackAccountLinkSection from '@/components/preferences/SlackAccountLinkSection.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';

type NotificationAlertChannel = 'email' | 'slack';

const NOTIFICATION_ALERT_CHANNELS: NotificationAlertChannel[] = [
  'email',
  'slack',
];

interface NotificationSubscriptions {
  taskAvailable?: NotificationAlertChannel[];
  evidenceDigest?: NotificationAlertChannel[];
  taskDailyDigest?: NotificationAlertChannel[];
  riskNotifications?: NotificationAlertChannel[];
}

interface SubscriptionsPreferencesResponse {
  notifications?: NotificationSubscriptions;
}

interface SubscriptionsPreferencesPayload {
  notifications: {
    evidence_digest: NotificationAlertChannel[];
    task_available: NotificationAlertChannel[];
    task_daily_digest: NotificationAlertChannel[];
    risk_notifications: NotificationAlertChannel[];
  };
}

interface UpdateNotificationPreferencesOptions {
  silent?: boolean;
}

type NotificationProviderAvailability = Record<
  NotificationAlertChannel,
  boolean
>;

interface SlackAvailabilityState {
  loading: boolean;
  configured: boolean;
  linked: boolean;
}

const normalizeNotificationChannels = (
  channels: unknown,
): NotificationAlertChannel[] => {
  if (!Array.isArray(channels)) {
    return [];
  }

  const normalized = channels.filter(
    (channel): channel is NotificationAlertChannel =>
      typeof channel === 'string' &&
      NOTIFICATION_ALERT_CHANNELS.includes(channel as NotificationAlertChannel),
  );

  return normalized;
};

const normalizeNotificationProviderAvailability = (
  providers: unknown,
): NotificationProviderAvailability => {
  const availability: NotificationProviderAvailability = {
    email: false,
    slack: false,
  };

  if (!Array.isArray(providers)) {
    return availability;
  }

  for (const provider of providers) {
    if (!provider || typeof provider !== 'object') {
      continue;
    }

    const providerType = (provider as { providerType?: unknown }).providerType;
    const enabled = (provider as { enabled?: unknown }).enabled;

    if (
      (providerType === 'email' || providerType === 'slack') &&
      typeof enabled === 'boolean'
    ) {
      availability[providerType] = enabled;
    }
  }

  return availability;
};

const fallbackNotificationProviderAvailability =
  (): NotificationProviderAvailability => ({
    email: true,
    slack: true,
  });

const axios = useAuthenticatedInstance();
const user = ref<CCFUser | null>(null);
const loading = ref(true);
const updating = ref(false);
const evidenceDigestAlertChannels = ref<NotificationAlertChannel[]>([]);
const taskAvailableAlertChannels = ref<NotificationAlertChannel[]>([]);
const taskDailyDigestAlertChannels = ref<NotificationAlertChannel[]>([]);
const riskNotificationsAlertChannels = ref<NotificationAlertChannel[]>([]);
const slackLinkConfigured = ref(false);
const slackStatusLoading = ref(true);
const isSlackLinked = ref(false);
const notificationProvidersLoading = ref(true);
const notificationProviderAvailability = ref<NotificationProviderAvailability>({
  email: false,
  slack: false,
});
const lastSavedPreferences = ref<SubscriptionsPreferencesPayload>({
  notifications: {
    evidence_digest: [],
    task_available: [],
    task_daily_digest: [],
    risk_notifications: [],
  },
});
const updateError = ref<string | null>(null);
const updateSuccess = ref(false);
const loadError = ref<string | null>(null);
const successTimeoutId = ref<number | null>(null);
let notificationUpdateQueue: Promise<void> = Promise.resolve();
let pendingNotificationUpdateOptions: UpdateNotificationPreferencesOptions | null =
  null;

const canSelectEmailAlertChannel = computed(
  () =>
    !notificationProvidersLoading.value &&
    notificationProviderAvailability.value.email,
);

const canSelectSlackAlertChannel = computed(
  () =>
    !notificationProvidersLoading.value &&
    notificationProviderAvailability.value.slack &&
    !slackStatusLoading.value &&
    slackLinkConfigured.value &&
    isSlackLinked.value,
);

const canSelectNotificationAlertChannel = (
  channel: NotificationAlertChannel,
): boolean => {
  if (channel === 'email') {
    return canSelectEmailAlertChannel.value;
  }

  return canSelectSlackAlertChannel.value;
};

const sanitizeNotificationChannels = (
  channels: NotificationAlertChannel[],
): NotificationAlertChannel[] => {
  return channels.filter((channel) => {
    if (channel === 'slack') {
      // Keep slack selections while Slack status is still loading to avoid
      // dropping a valid selection before we know whether it is linked.
      if (notificationProvidersLoading.value || slackStatusLoading.value) {
        return true;
      }

      return canSelectNotificationAlertChannel(channel);
    }

    return canSelectNotificationAlertChannel(channel);
  });
};

const removeUnavailableNotificationSelections = () => {
  if (notificationProvidersLoading.value) {
    return false;
  }

  const sanitizedEvidenceDigestChannels = sanitizeNotificationChannels(
    evidenceDigestAlertChannels.value,
  );
  const sanitizedTaskAvailableChannels = sanitizeNotificationChannels(
    taskAvailableAlertChannels.value,
  );
  const sanitizedTaskDailyDigestChannels = sanitizeNotificationChannels(
    taskDailyDigestAlertChannels.value,
  );
  const sanitizedRiskNotificationsChannels = sanitizeNotificationChannels(
    riskNotificationsAlertChannels.value,
  );

  const hadUnavailableNotificationSelection =
    sanitizedEvidenceDigestChannels.length !==
      evidenceDigestAlertChannels.value.length ||
    sanitizedTaskAvailableChannels.length !==
      taskAvailableAlertChannels.value.length ||
    sanitizedTaskDailyDigestChannels.length !==
      taskDailyDigestAlertChannels.value.length ||
    sanitizedRiskNotificationsChannels.length !==
      riskNotificationsAlertChannels.value.length;

  if (!hadUnavailableNotificationSelection) {
    return false;
  }

  evidenceDigestAlertChannels.value = sanitizedEvidenceDigestChannels;
  taskAvailableAlertChannels.value = sanitizedTaskAvailableChannels;
  taskDailyDigestAlertChannels.value = sanitizedTaskDailyDigestChannels;
  riskNotificationsAlertChannels.value = sanitizedRiskNotificationsChannels;

  return true;
};

const buildNotificationPreferencesPayload =
  (): SubscriptionsPreferencesPayload => {
    const persistedEvidenceDigestChannels = sanitizeNotificationChannels(
      evidenceDigestAlertChannels.value,
    );
    const persistedTaskAvailableChannels = sanitizeNotificationChannels(
      taskAvailableAlertChannels.value,
    );
    const persistedTaskDailyDigestChannels = sanitizeNotificationChannels(
      taskDailyDigestAlertChannels.value,
    );
    const persistedRiskNotificationsChannels = sanitizeNotificationChannels(
      riskNotificationsAlertChannels.value,
    );

    return {
      notifications: {
        evidence_digest: persistedEvidenceDigestChannels,
        task_available: persistedTaskAvailableChannels,
        task_daily_digest: persistedTaskDailyDigestChannels,
        risk_notifications: persistedRiskNotificationsChannels,
      },
    };
  };

const revertToLastSavedNotificationPreferences = () => {
  evidenceDigestAlertChannels.value = sanitizeNotificationChannels([
    ...lastSavedPreferences.value.notifications.evidence_digest,
  ]);
  taskAvailableAlertChannels.value = sanitizeNotificationChannels([
    ...lastSavedPreferences.value.notifications.task_available,
  ]);
  taskDailyDigestAlertChannels.value = sanitizeNotificationChannels([
    ...lastSavedPreferences.value.notifications.task_daily_digest,
  ]);
  riskNotificationsAlertChannels.value = sanitizeNotificationChannels([
    ...lastSavedPreferences.value.notifications.risk_notifications,
  ]);
};

const normalizeUpdateNotificationPreferencesOptions = (
  options: UpdateNotificationPreferencesOptions = {},
): Required<UpdateNotificationPreferencesOptions> => {
  return {
    silent: options.silent ?? false,
  };
};

const mergeUpdateNotificationPreferencesOptions = (
  existingOptions: UpdateNotificationPreferencesOptions | null,
  incomingOptions: Required<UpdateNotificationPreferencesOptions>,
): Required<UpdateNotificationPreferencesOptions> => {
  return {
    silent: (existingOptions?.silent ?? true) && incomingOptions.silent,
  };
};

const performNotificationPreferencesUpdate = async (
  options: Required<UpdateNotificationPreferencesOptions>,
) => {
  const { silent = false } = options;

  updating.value = true;
  updateError.value = null;
  updateSuccess.value = false;

  if (successTimeoutId.value) {
    clearTimeout(successTimeoutId.value);
    successTimeoutId.value = null;
  }

  const payload = buildNotificationPreferencesPayload();

  try {
    await axios.put('/api/users/me/subscriptions', payload);

    lastSavedPreferences.value = {
      notifications: {
        evidence_digest: [...payload.notifications.evidence_digest],
        task_available: [...payload.notifications.task_available],
        task_daily_digest: [...payload.notifications.task_daily_digest],
        risk_notifications: [...payload.notifications.risk_notifications],
      },
    };

    if (!silent) {
      updateSuccess.value = true;
      // Hide success message after 3 seconds
      successTimeoutId.value = window.setTimeout(() => {
        updateSuccess.value = false;
      }, 3000);
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    updateError.value = 'Failed to update preferences. Please try again.';

    revertToLastSavedNotificationPreferences();
  } finally {
    updating.value = false;
  }
};

const drainQueuedNotificationPreferencesUpdates = async () => {
  while (pendingNotificationUpdateOptions) {
    const nextUpdateOptions = normalizeUpdateNotificationPreferencesOptions(
      pendingNotificationUpdateOptions,
    );
    pendingNotificationUpdateOptions = null;
    await performNotificationPreferencesUpdate(nextUpdateOptions);
  }
};

const updateNotificationPreferences = (
  options: UpdateNotificationPreferencesOptions = {},
) => {
  const normalizedOptions =
    normalizeUpdateNotificationPreferencesOptions(options);

  pendingNotificationUpdateOptions = mergeUpdateNotificationPreferencesOptions(
    pendingNotificationUpdateOptions,
    normalizedOptions,
  );

  notificationUpdateQueue = notificationUpdateQueue.then(
    drainQueuedNotificationPreferencesUpdates,
    drainQueuedNotificationPreferencesUpdates,
  );

  return notificationUpdateQueue;
};

const syncUnavailableNotificationSelections = async () => {
  if (!removeUnavailableNotificationSelections()) {
    return;
  }

  await updateNotificationPreferences({ silent: true });
};

const notificationChannelOptions = computed<
  Array<{
    label: string;
    value: NotificationAlertChannel;
    disabled?: boolean;
    disabledTooltip?: string;
  }>
>(() => [
  {
    label: 'Email',
    value: 'email',
    disabled: !canSelectEmailAlertChannel.value,
    disabledTooltip: !canSelectEmailAlertChannel.value
      ? (emailAlertUnavailableReason.value ?? undefined)
      : undefined,
  },
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

const emailAlertUnavailableReason = computed(() => {
  if (notificationProvidersLoading.value) {
    return 'Email alerts are unavailable until notification providers finish loading.';
  }

  if (!notificationProviderAvailability.value.email) {
    return 'Email alerts are unavailable because email notifications are disabled for this environment.';
  }

  return null;
});

const slackAlertUnavailableReason = computed(() => {
  if (notificationProvidersLoading.value) {
    return 'Slack alerts are unavailable until notification providers finish loading.';
  }

  if (!notificationProviderAvailability.value.slack) {
    return 'Slack alerts are unavailable because Slack notifications are disabled for this environment.';
  }

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

const riskNotificationsTooltipText = computed(() =>
  riskNotificationsAlertChannels.value.length === 0
    ? 'Risk notifications are turned off.'
    : 'Risk notifications will be sent to your chosen channels.',
);

// Load user data and subscriptions
const loadUserData = async () => {
  try {
    const notificationProvidersRequest = axios
      .get<{
        data: Array<{
          providerType?: string;
          enabled?: boolean;
        }>;
      }>('/api/notifications/providers')
      .catch((error) => {
        console.error('Error loading notification providers:', error);
        return null;
      });

    const [userResponse, subscriptionResponse, notificationProvidersResponse] =
      await Promise.all([
        axios.get<{ data: CCFUser }>('/api/users/me'),
        axios.get<{ data: SubscriptionsPreferencesResponse }>(
          '/api/users/me/subscriptions',
        ),
        notificationProvidersRequest,
      ]);

    // Get current user info
    user.value = userResponse.data.data;

    notificationProviderAvailability.value =
      notificationProvidersResponse === null
        ? fallbackNotificationProviderAvailability()
        : normalizeNotificationProviderAvailability(
            notificationProvidersResponse.data.data,
          );
    notificationProvidersLoading.value = false;

    const evidenceDigestChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.evidenceDigest,
    );

    evidenceDigestAlertChannels.value = evidenceDigestChannels;

    const taskAvailableChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.taskAvailable,
    );

    taskAvailableAlertChannels.value = taskAvailableChannels;

    const taskDailyDigestChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.taskDailyDigest,
    );

    taskDailyDigestAlertChannels.value = taskDailyDigestChannels;

    const riskNotificationsChannels = normalizeNotificationChannels(
      subscriptionResponse.data.data.notifications?.riskNotifications,
    );

    riskNotificationsAlertChannels.value = riskNotificationsChannels;

    lastSavedPreferences.value = {
      notifications: {
        evidence_digest: [...evidenceDigestAlertChannels.value],
        task_available: [...taskAvailableAlertChannels.value],
        task_daily_digest: [...taskDailyDigestAlertChannels.value],
        risk_notifications: [...riskNotificationsAlertChannels.value],
      },
    };

    await syncUnavailableNotificationSelections();
  } catch (error) {
    console.error('Error loading user data:', error);
    loadError.value =
      'Failed to load preferences. Please refresh the page to try again.';
  } finally {
    notificationProvidersLoading.value = false;
    loading.value = false;
  }
};

const onEvidenceDigestChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  evidenceDigestAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateNotificationPreferences();
};

const onTaskAvailableChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  taskAvailableAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateNotificationPreferences();
};

const onTaskDailyDigestChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  taskDailyDigestAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateNotificationPreferences();
};

const onRiskNotificationsChannelsChange = async (
  channels: NotificationAlertChannel[],
) => {
  riskNotificationsAlertChannels.value = sanitizeNotificationChannels(channels);
  await updateNotificationPreferences();
};

const onSlackLinkStatusChange = (state: SlackAvailabilityState) => {
  slackStatusLoading.value = state.loading;
  slackLinkConfigured.value = state.configured;
  isSlackLinked.value = state.linked;
};

watch([slackStatusLoading, canSelectSlackAlertChannel], () => {
  void syncUnavailableNotificationSelections();
});

onMounted(() => {
  loadUserData();
});

onUnmounted(() => {
  if (successTimeoutId.value) {
    clearTimeout(successTimeoutId.value);
  }
});

// Design-system view ---------------------------------------------------------------------------

const channelOptions = computed(() =>
  notificationChannelOptions.value.map((option) => ({
    value: option.value,
    label: option.label,
    disabledReason: option.disabled
      ? (option.disabledTooltip ?? 'Not available.')
      : undefined,
  })),
);
const notifications = computed(() => [
  {
    key: 'evidence-digest',
    group: 'Evidence',
    legend: 'Evidence digest',
    hint: evidenceDigestTooltipText.value,
    model: evidenceDigestAlertChannels.value,
    change: onEvidenceDigestChannelsChange,
  },
  {
    key: 'task-available',
    group: 'Tasks',
    legend: 'Task available',
    hint: taskAvailableTooltipText.value,
    model: taskAvailableAlertChannels.value,
    change: onTaskAvailableChannelsChange,
  },
  {
    key: 'task-digest',
    group: 'Tasks',
    legend: 'Daily task digest',
    hint: taskDailyDigestTooltipText.value,
    model: taskDailyDigestAlertChannels.value,
    change: onTaskDailyDigestChannelsChange,
  },
  {
    key: 'risk-notifications',
    group: 'Risks',
    legend: 'Risk notifications',
    hint: riskNotificationsTooltipText.value,
    model: riskNotificationsAlertChannels.value,
    change: onRiskNotificationsChannelsChange,
  },
]);
const account = computed(() => [
  { key: 'email', label: 'Email', value: user.value?.email },
  {
    key: 'name',
    label: 'Name',
    value:
      `${user.value?.firstName ?? ''} ${user.value?.lastName ?? ''}`.trim(),
  },
  {
    key: 'method',
    label: 'Signs in with',
    value: user.value?.authMethod || 'Password',
  },
]);
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Preferences"
      description="Where your notifications go, and your account."
    />
    <DataState
      v-if="loading || loadError"
      :status="loading ? 'loading' : 'error'"
      subject="your preferences"
      :error-message="loadError ?? undefined"
      skeleton="panel"
      @retry="loadUserData"
    />
    <template v-else>
      <Panel title="Notifications" :level="2">
        <PanelSection
          v-for="item in notifications"
          :key="item.key"
          :title="item.legend"
          :description="item.hint"
        >
          <CheckboxGroup
            :model-value="item.model"
            :legend="`Send ${item.legend.toLowerCase()} by`"
            :options="channelOptions"
            @update:model-value="(channels) => item.change(channels as never)"
          />
        </PanelSection>
        <InlineMessage v-if="updateError" tone="error" title="Not saved">
          <p>{{ updateError }}</p>
        </InlineMessage>
        <InlineMessage v-if="updateSuccess" tone="success" title="Saved" />
      </Panel>
      <Panel title="Account" :level="2">
        <DescriptionList :items="account" />
        <LegacyPage>
          <SlackAccountLinkSection @status-change="onSlackLinkStatusChange" />
        </LegacyPage>
      </Panel>
    </template>
  </Stack>
</template>
