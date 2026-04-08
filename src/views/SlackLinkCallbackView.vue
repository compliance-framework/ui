<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
  >
    <div
      class="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800"
    >
      <div
        class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
      ></div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Completing Slack Link
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {{ statusMessage }}
      </p>
      <button
        v-if="showReturnButton"
        @click="goToPreferences"
        class="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Return to Preferences
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isNavigationFailure, useRoute, useRouter } from 'vue-router';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
  resolveSlackCallbackCode,
  resolveSlackCallbackStatus,
} from '@/utils/slack-link-callback';

const route = useRoute();
const router = useRouter();
const showReturnButton = ref(false);

const callbackStatus = computed(() => {
  return resolveSlackCallbackStatus(route.query.status);
});

const callbackCode = computed(() => {
  return resolveSlackCallbackCode(route.query.code);
});

const statusMessage = computed(() => {
  const redirectSuffix = showReturnButton.value
    ? 'Click below to return to Preferences.'
    : 'Returning to Preferences...';

  if (callbackStatus.value === 'success') {
    return `Slack linking completed. ${redirectSuffix}`;
  }
  if (callbackStatus.value === 'error' && callbackCode.value) {
    return `Slack linking failed (${callbackCode.value}). ${redirectSuffix}`;
  }
  if (callbackStatus.value === 'error') {
    return `Slack linking failed. ${redirectSuffix}`;
  }
  return `Slack link callback could not be validated. ${redirectSuffix}`;
});

const buildPreferencesLocation = () => {
  const query: Record<string, string> = {};

  if (callbackStatus.value) {
    query[CALLBACK_STATUS_QUERY_KEY] = callbackStatus.value;
  }

  if (callbackStatus.value && callbackCode.value) {
    query[CALLBACK_CODE_QUERY_KEY] = callbackCode.value;
  }

  if (Object.keys(query).length === 0) {
    return {
      name: 'preferences' as const,
    };
  }

  return {
    name: 'preferences' as const,
    query,
  };
};

const goToPreferences = async () => {
  const navigationResult = await router.replace(buildPreferencesLocation());

  if (isNavigationFailure(navigationResult)) {
    showReturnButton.value = true;
  }
};

onMounted(() => {
  goToPreferences().catch(() => {
    showReturnButton.value = true;
  });
});
</script>
