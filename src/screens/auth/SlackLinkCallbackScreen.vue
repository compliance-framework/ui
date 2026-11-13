<script setup lang="ts">
/**
 * Back from linking Slack (Guest template): returns to Preferences with the outcome. The script
 * is the classic page's.
 */
import { computed, onMounted, ref } from 'vue';
import { isNavigationFailure, useRoute, useRouter } from 'vue-router';
import {
  CALLBACK_CODE_QUERY_KEY,
  CALLBACK_STATUS_QUERY_KEY,
  resolveSlackCallbackCode,
  resolveSlackCallbackStatus,
} from '@/utils/slack-link-callback';
import Button from '@/ds/components/Button/Button.vue';
import Text from '@/ds/components/Text/Text.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';

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

<template>
  <GuestTemplate title="Linking Slack">
    <Text role="status">{{ statusMessage }}</Text>
    <Button v-if="showReturnButton" variant="primary" @click="goToPreferences"
      >Return to Preferences</Button
    >
  </GuestTemplate>
</template>
