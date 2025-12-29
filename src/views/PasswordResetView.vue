<template>
  <PageCard class="mx-auto mt-12 max-w-96 py-8">
    <div class="px-8 pb-8">
      <SideNavLogo alt="Vue logo" :src="lightLogo" class="w-full dark:hidden" />
      <SideNavLogo
        alt="Vue logo"
        :src="darkLogo"
        class="w-full hidden dark:block"
      />
    </div>

    <div class="px-8">
      <h2
        class="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2"
      >
        Reset Password
      </h2>
      <p class="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
        Enter your new password below.
      </p>
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4 px-8">
      <div>
        <label
          for="password"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >New Password</label
        >
        <FormInput
          v-model="password"
          placeholder="Enter new password"
          type="password"
        />
        <span
          class="text-sm text-red-500 dark:text-red-500"
          v-for="error in errors.password"
          :key="error"
          >{{ error }}</span
        >
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Password must be at least 8 characters long.
        </p>
      </div>

      <div>
        <label
          for="confirmPassword"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Confirm New Password</label
        >
        <FormInput
          v-model="confirmPassword"
          placeholder="Confirm new password"
          type="password"
        />
        <span
          class="text-sm text-red-500 dark:text-red-500"
          v-if="passwordMismatch"
          >Passwords do not match</span
        >
      </div>

      <div>
        <PrimaryButton
          type="submit"
          class="w-full"
          :disabled="isLoading || !isFormValid"
        >
          <span v-if="isLoading">Resetting...</span>
          <span v-else>Reset Password</span>
        </PrimaryButton>
      </div>
    </form>

    <div class="px-8 mt-6 text-center">
      <router-link
        :to="{ name: 'login' }"
        class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Back to Login
      </router-link>
    </div>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-md"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-green-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-800">{{ successMessage }}</p>
        </div>
      </div>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import PageCard from '@/components/PageCard.vue';
import { ref, computed, onMounted } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useRouter, useRoute } from 'vue-router';
import FormInput from '@/components/forms/FormInput.vue';
import lightLogo from '@/assets/logo-light.svg';
import darkLogo from '@/assets/logo-dark.svg';
import SideNavLogo from '@/components/navigation/SideNavLogo.vue';
import { useToast } from 'primevue/usetoast';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';

interface AuthError {
  password: string[];
  token: string[];
}

const password = ref('');
const confirmPassword = ref('');
const token = ref('');
const errors = ref<AuthError>({} as AuthError);
const isLoading = ref(false);
const successMessage = ref('');

const router = useRouter();
const route = useRoute();
const toast = useToast();

const { execute: resetPassword } = useGuestApi<string>(
  '/api/auth/password-reset',
  {
    method: 'POST',
  },
  { immediate: false },
);

const passwordMismatch = computed(() => {
  return (
    confirmPassword.value &&
    password.value &&
    confirmPassword.value !== password.value
  );
});

const isFormValid = computed(() => {
  return (
    password.value &&
    confirmPassword.value &&
    !passwordMismatch.value &&
    password.value.length >= 8 &&
    token.value
  );
});

onMounted(() => {
  // Get token from query parameters
  const tokenParam = route.query.token;
  if (typeof tokenParam === 'string') {
    token.value = tokenParam;
  } else if (Array.isArray(tokenParam)) {
    token.value = tokenParam[0] || '';
  }

  // If no token is provided, redirect to forgot password
  if (!token.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Reset Link',
      detail: 'This password reset link is invalid or has expired.',
      life: 4000,
    });
    router.push({ name: 'forgot-password' });
  }
});

async function onSubmit() {
  if (!isFormValid.value) return;

  errors.value = {} as AuthError;
  isLoading.value = true;

  try {
    const response = await resetPassword({
      data: {
        password: password.value,
        token: token.value,
      },
    });

    successMessage.value =
      response.data.value?.data || 'Password has been reset successfully.';

    toast.add({
      severity: 'success',
      summary: 'Password Reset Successful',
      detail:
        'Your password has been reset. You can now log in with your new password.',
      life: 5000,
    });

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push({ name: 'login' });
    }, 2000);
  } catch (error) {
    const response = error as AxiosError<DataResponse<AuthError>>;
    if (response.response?.data?.data) {
      errors.value = response.response.data.data as AuthError;
    } else {
      const errorMessage =
        response.response?.status === 401
          ? 'This reset link is invalid or has expired.'
          : 'Unable to reset password. Please try again.';

      toast.add({
        severity: 'error',
        summary: 'Reset Failed',
        detail: errorMessage,
        life: 4000,
      });
    }
  } finally {
    isLoading.value = false;
  }
}
</script>
