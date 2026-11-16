<script setup lang="ts">
/**
 * Finishing SSO sign-in (Guest template): loads the account the provider signed in, then goes on
 * to the page the user asked for. The script is the classic page's.
 */
import { onMounted, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthHydration } from '@/composables/useAuthHydration';
import { resolveAuthNextLocation } from '@/utils/auth-redirect';
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { hydrateCurrentUser } = useAuthHydration();

const status = ref<'loading' | 'success' | 'error'>('loading');

const statusMessage = computed(() => {
  if (status.value === 'loading') {
    return 'Verifying your account...';
  }
  if (status.value === 'success') {
    return 'SSO sign-in successful. Redirecting you to the application...';
  }
  return 'We could not complete your SSO sign-in. Please try again.';
});

const goToLogin = () => {
  router.replace({ name: 'login' });
};

const SUCCESS_TOAST_DURATION = 2500;
const ERROR_TOAST_DURATION = 4000;

onMounted(async () => {
  try {
    await hydrateCurrentUser();
    status.value = 'success';

    toast.add({
      severity: 'success',
      summary: 'Welcome back',
      detail: 'You are now signed in via SSO.',
      life: SUCCESS_TOAST_DURATION,
    });

    const nextLocation = resolveAuthNextLocation(route.query.next);
    setTimeout(() => {
      router.replace(nextLocation);
    }, SUCCESS_TOAST_DURATION);
  } catch {
    console.error('Failed to finalize SSO login');
    status.value = 'error';
    toast.add({
      severity: 'error',
      summary: 'SSO Login Failed',
      detail: 'Please try signing in again.',
      life: ERROR_TOAST_DURATION,
    });
    setTimeout(goToLogin, ERROR_TOAST_DURATION);
  }
});
</script>

<template>
  <GuestTemplate title="Finishing sign-in">
    <InlineMessage v-if="status === 'error'" tone="error">
      <p>{{ statusMessage }}</p>
    </InlineMessage>
    <Text v-else role="status">{{ statusMessage }}</Text>
    <Button v-if="status === 'error'" variant="primary" @click="goToLogin"
      >Back to sign in</Button
    >
  </GuestTemplate>
</template>
