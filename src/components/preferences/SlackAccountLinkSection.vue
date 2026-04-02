<template>
  <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
    <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
      Slack
    </h3>
    <p
      v-if="!slackStatusLoading && slackLinkConfigured && !isSlackLinked"
      class="mt-2 text-base text-gray-600 dark:text-gray-400"
    >
      Linking redirects you to Slack and returns you here after authorization.
    </p>

    <div
      v-if="slackStatusLoading"
      class="mt-4 rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
    >
      Loading Slack link status...
    </div>

    <template v-else-if="!slackLinkConfigured">
      <div
        class="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200"
      >
        Slack linking is not configured for this environment.
      </div>
    </template>

    <template v-else>
      <div
        class="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div class="flex min-w-0 items-start gap-4">
          <div
            class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/70"
            aria-hidden="true"
          >
            <img
              :src="slackLogoLight"
              alt="Slack logo"
              class="h-10 w-10 object-contain"
            />
          </div>

          <div class="min-w-0">
            <p
              class="break-words text-sm font-medium leading-snug text-gray-900 dark:text-gray-100"
            >
              {{
                isSlackLinked
                  ? linkedConnectionText
                  : 'Link your Slack identity to this account.'
              }}
            </p>
          </div>
        </div>

        <button
          v-if="!isSlackLinked"
          @click="startSlackLinkFlow"
          :disabled="slackActionLoading"
          class="self-start rounded-md bg-blue-600 px-5 py-2.5 text-lg font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ slackActionLoading ? 'Redirecting...' : 'Link' }}
        </button>

        <button
          v-else
          @click="unlinkSlackAccount"
          :disabled="slackActionLoading"
          class="self-start rounded-md bg-red-600 px-5 py-2.5 text-lg font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ slackActionLoading ? 'Unlinking...' : 'Unlink' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
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
import slackLogoLight from '@/assets/slack-logo-light.svg';

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
  const callbackHandled = await handleSlackCallbackReturn();
  if (!callbackHandled) {
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
