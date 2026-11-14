<script setup lang="ts">
/**
 * Preferences → Account → Slack: whether this account is linked to a Slack identity, with Link
 * (a redirect to Slack and back) or Unlink. It also finishes the link when Slack redirects back
 * with a status in the query, and reports its state so Slack alerts can be offered. The script
 * is the classic section's.
 */
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Skeleton from '@/ds/components/Skeleton/Skeleton.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import { computed, onMounted, ref, watchEffect } from 'vue';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useConfigStore } from '@/stores/config';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
  resolveSlackCallbackCode,
  resolveSlackCallbackStatus,
} from '@/utils/slack-link-callback';

interface SlackLinkStatus {
  linked: boolean;
  slackUserId?: string;
  slackTeamId?: string;
  slackTeamDomain?: string;
  slackTeamName?: string;
  slackDisplayName?: string;
  slackEmail?: string;
  linkedAt?: string;
}

interface SlackAvailabilityState {
  loading: boolean;
  configured: boolean;
  linked: boolean;
}

const SUCCESS_TOAST_DURATION = 3500;
const INFO_TOAST_DURATION = 4000;
const ERROR_TOAST_DURATION = 5000;

const emit = defineEmits<{
  'status-change': [state: SlackAvailabilityState];
}>();

const axios = useAuthenticatedInstance();
const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const slackLinkStatus = ref<SlackLinkStatus | null>(null);
const slackLinkConfigured = ref(true);
const slackStatusLoading = ref(true);
const slackActionLoading = ref(false);
const slackError = ref<string | null>(null);

const isSlackLinked = computed(() => slackLinkStatus.value?.linked === true);

const linkedConnectionText = computed(() => {
  const workspace =
    slackLinkStatus.value?.slackTeamDomain ||
    slackLinkStatus.value?.slackTeamName ||
    'your workspace';
  const identity =
    slackLinkStatus.value?.slackEmail ||
    slackLinkStatus.value?.slackDisplayName ||
    'your Slack account';

  return `Connected to ${workspace} as ${identity}`;
});

const getErrorMessage = (error: unknown, fallback: string) => {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.data?.errors?.body || fallback;
};

const resolveSlackCallbackError = (code?: string) => {
  const normalizedCode = code?.toLowerCase();
  switch (normalizedCode) {
    case 'not_configured':
      return 'Slack account linking is not configured';
    case 'unauthorized':
      return 'Unable to authenticate user for Slack linking';
    case 'init_failed':
      return 'Failed to initialize Slack account linking';
    case 'error_occurred':
      return 'An error occurred during Slack account linking';
    case 'linking_exists':
      return 'This Slack account is already linked to another user';
    default:
      return code
        ? `Slack linking failed (${code}). Please try again.`
        : 'Slack linking failed. Please try again.';
  }
};

const showSlackSuccessToast = (detail: string) => {
  toast.add({
    severity: 'success',
    summary: 'Slack Linked',
    detail,
    life: SUCCESS_TOAST_DURATION,
  });
};

const showSlackInfoToast = (detail: string) => {
  toast.add({
    severity: 'info',
    summary: 'Slack',
    detail,
    life: INFO_TOAST_DURATION,
  });
};

const showSlackWarningToast = (detail: string) => {
  toast.add({
    severity: 'warn',
    summary: 'Slack',
    detail,
    life: INFO_TOAST_DURATION,
  });
};

const setSlackError = (message: string) => {
  slackError.value = message;

  toast.add({
    severity: 'error',
    summary: 'Slack Linking Failed',
    detail: message,
    life: ERROR_TOAST_DURATION,
  });
};

const clearSlackCallbackQuery = async () => {
  const query = { ...route.query };
  delete query[CALLBACK_STATUS_QUERY_KEY];
  delete query[CALLBACK_CODE_QUERY_KEY];
  await router.replace({ query });
};

const loadSlackLinkStatus = async () => {
  slackStatusLoading.value = true;
  slackError.value = null;

  try {
    const response = await axios.get<{ data: SlackLinkStatus }>(
      '/api/auth/slack/link/status',
    );
    slackLinkStatus.value = response.data.data;
    slackLinkConfigured.value = true;
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status === 404) {
      slackLinkConfigured.value = false;
      slackLinkStatus.value = null;
      return;
    }

    slackLinkConfigured.value = true;
    setSlackError(getErrorMessage(error, 'Failed to load Slack link status.'));
  } finally {
    slackStatusLoading.value = false;
  }
};

const handleSlackCallbackReturn = async () => {
  const callbackStatus = resolveSlackCallbackStatus(
    route.query[CALLBACK_STATUS_QUERY_KEY],
  );

  if (!callbackStatus) {
    return false;
  }

  const callbackCode = resolveSlackCallbackCode(
    route.query[CALLBACK_CODE_QUERY_KEY],
  );
  await clearSlackCallbackQuery();

  if (callbackStatus === 'error') {
    setSlackError(resolveSlackCallbackError(callbackCode));
    await loadSlackLinkStatus();
    return true;
  }

  await loadSlackLinkStatus();
  if (slackError.value) {
    return true;
  }

  if (isSlackLinked.value) {
    showSlackSuccessToast('Slack account linked successfully.');
  } else {
    showSlackWarningToast(
      'Slack linking completed, but we could not confirm your linked account yet.',
    );
  }

  return true;
};

const startSlackLinkFlow = async () => {
  slackActionLoading.value = true;
  slackError.value = null;

  try {
    const config = await configStore.getConfig();
    const startUrl = `${config.API_URL}/api/auth/slack/link/start`;
    showSlackInfoToast('Redirecting to Slack authorization...');
    window.location.assign(startUrl);
  } catch (error) {
    setSlackError(getErrorMessage(error, 'Failed to start Slack linking.'));
    slackActionLoading.value = false;
  }
};

const unlinkSlackAccount = async () => {
  slackActionLoading.value = true;
  slackError.value = null;

  try {
    await axios.delete('/api/auth/slack/link');
    await loadSlackLinkStatus();
    showSlackSuccessToast('Slack account unlinked successfully.');
  } catch (error) {
    setSlackError(getErrorMessage(error, 'Failed to unlink Slack account.'));
  } finally {
    slackActionLoading.value = false;
  }
};

const initializeSlackLinkSection = async () => {
  try {
    const callbackHandled = await handleSlackCallbackReturn();
    if (!callbackHandled) {
      await loadSlackLinkStatus();
    }
  } catch (error) {
    setSlackError(
      getErrorMessage(error, 'Failed to initialize Slack linking.'),
    );
    await loadSlackLinkStatus();
  }
};

onMounted(() => {
  void initializeSlackLinkSection();
});

watchEffect(() => {
  emit('status-change', {
    loading: slackStatusLoading.value,
    configured: slackLinkConfigured.value,
    linked: isSlackLinked.value,
  });
});
</script>

<template>
  <PanelSection title="Slack">
    <Skeleton v-if="slackStatusLoading" />
    <InlineMessage v-else-if="!slackLinkConfigured" tone="warning"
      >Slack linking is not configured for this environment.</InlineMessage
    >
    <Cluster v-else justify="between" gap="3">
      <Text v-if="isSlackLinked">{{ linkedConnectionText }}</Text>
      <Text v-else
        >Link your Slack identity to this account. Linking takes you to Slack
        and brings you back here.</Text
      >
      <Button
        v-if="!isSlackLinked"
        variant="primary"
        :loading="slackActionLoading"
        @click="startSlackLinkFlow"
        >Link Slack</Button
      >
      <Button
        v-else
        variant="danger"
        :loading="slackActionLoading"
        @click="unlinkSlackAccount"
        >Unlink Slack</Button
      >
    </Cluster>
  </PanelSection>
</template>
