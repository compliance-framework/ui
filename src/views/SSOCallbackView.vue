<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
  >
    <div class="rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
      <div
        class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
      ></div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        Finishing SSO Sign-in
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {{ statusMessage }}
      </p>
      <button
        v-if="status === 'error'"
        @click="goToLogin"
        class="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Return to Login
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter, useRoute, type RouteLocationRaw } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { useGuestInstance } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import type { DataResponse, CCFUser } from '@/stores/types';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const userStore = useUserStore();
const axios = useGuestInstance();

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
  } catch (error) {
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

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
