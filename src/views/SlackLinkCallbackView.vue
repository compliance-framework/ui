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
import { useRoute, useRouter } from 'vue-router';
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
  return resolveSlackCallbackStatus(route.query.status) === 'success'
    ? 'success'
    : 'error';
});

const callbackCode = computed(() => {
  return resolveSlackCallbackCode(route.query.code);
});

const statusMessage = computed(() => {
  if (callbackStatus.value === 'success') {
    return 'Slack linking completed. Returning to Preferences...';
  }
  if (callbackCode.value) {
    return `Slack linking failed (${callbackCode.value}). Returning to Preferences...`;
  }
  return 'Slack linking failed. Returning to Preferences...';
});

const buildPreferencesQuery = () => {
  const query: Record<string, string> = {
    [CALLBACK_STATUS_QUERY_KEY]: callbackStatus.value,
  };

  if (callbackCode.value) {
    query[CALLBACK_CODE_QUERY_KEY] = callbackCode.value;
  }

  return query;
};

const goToPreferences = async () => {
  await router.replace({
    name: 'preferences',
    query: buildPreferencesQuery(),
  });
};

onMounted(() => {
  goToPreferences().catch(() => {
    showReturnButton.value = true;
  });
});
</script>
