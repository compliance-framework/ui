<template>
  <AuthPanelCard>
    <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
      Processing
    </p>
    <h1
      class="ui-v2-display text-[34px] font-bold uppercase leading-none tracking-[-0.02em] text-[var(--ui-v2-foreground)]"
    >
      Finishing SSO Sign-In
    </h1>
    <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
      {{ statusMessage }}
    </p>

    <ul class="mt-5 space-y-2">
      <li
        v-for="step in steps"
        :key="step.label"
        class="ui-v2-nav flex items-center gap-2 border px-3 py-2"
        :class="step.className"
      >
        <span class="w-4 text-center">{{ step.indicator }}</span>
        <span>{{ step.label }}</span>
      </li>
    </ul>

    <button
      v-if="status === 'error'"
      class="ui-v2-nav mt-5 border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
      type="button"
      @click="goToLogin"
    >
      Return to Login
    </button>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useGuestInstance } from '@/composables/axios';
import { useUserStore } from '@/stores/auth';
import type { CCFUser, DataResponse } from '@/stores/types';
import AuthPanelCard from '@/components/v2/auth/AuthPanelCard.vue';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const userStore = useUserStore();
const axios = useGuestInstance();

const status = ref<'loading' | 'success' | 'error'>('loading');

const statusMessage = computed(() => {
  if (status.value === 'loading') {
    return 'Verifying your account and validating session scopes.';
  }
  if (status.value === 'success') {
    return 'SSO sign-in successful. Redirecting you to the application.';
  }
  return 'We could not complete your SSO sign-in. Please try again.';
});

type Step = {
  label: string;
  indicator: string;
  className: string;
};

const steps = computed<Step[]>(() => {
  if (status.value === 'success') {
    return [
      {
        label: 'Verifying account',
        indicator: 'OK',
        className:
          'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-foreground)]',
      },
      {
        label: 'Loading profile',
        indicator: 'OK',
        className:
          'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-foreground)]',
      },
      {
        label: 'Redirecting',
        indicator: 'OK',
        className:
          'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-foreground)]',
      },
    ];
  }

  if (status.value === 'error') {
    return [
      {
        label: 'Verifying account',
        indicator: '!!',
        className:
          'border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] text-[var(--ui-v2-error)]',
      },
      {
        label: 'Loading profile',
        indicator: '--',
        className:
          'border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-tertiary-foreground)]',
      },
      {
        label: 'Redirecting',
        indicator: '--',
        className:
          'border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-tertiary-foreground)]',
      },
    ];
  }

  return [
    {
      label: 'Verifying account',
      indicator: '..',
      className:
        'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-foreground)]',
    },
    {
      label: 'Loading profile',
      indicator: '..',
      className:
        'border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-tertiary-foreground)]',
    },
    {
      label: 'Redirecting',
      indicator: '..',
      className:
        'border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-tertiary-foreground)]',
    },
  ];
});

const goToLogin = () => {
  router.replace({ name: 'login' });
};

const fetchCurrentUser = async () => {
  const response = await axios.get<DataResponse<CCFUser>>('/api/users/me');
  return response.data.data;
};

const isSafeRelativePath = (path: string) => {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
};

const resolveNextLocation = (): RouteLocationRaw => {
  const nextParam = route.query.next;
  if (
    typeof nextParam === 'string' &&
    nextParam.trim().length > 0 &&
    isSafeRelativePath(nextParam)
  ) {
    return { path: nextParam };
  }
  return { name: 'home' };
};

const SUCCESS_TOAST_DURATION = 2500;
const ERROR_TOAST_DURATION = 4000;

onMounted(async () => {
  try {
    const user = await fetchCurrentUser();
    userStore.user = user;
    userStore.isAuthenticated = true;
    status.value = 'success';

    toast.add({
      severity: 'success',
      summary: 'Welcome back',
      detail: 'You are now signed in via SSO.',
      life: SUCCESS_TOAST_DURATION,
    });

    const nextLocation = resolveNextLocation();
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
