<template>
  <PageCard class="mx-auto mt-12 max-w-96 py-8 space-y-6">
    <AuthFormHeader
      title="Reset Password"
      subtitle="Enter your new password below."
    >
      <p v-if="tokenError" class="mt-4 text-sm text-red-600 dark:text-red-400">
        {{ tokenError }}
      </p>
    </AuthFormHeader>

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
          id="password"
        />
        <span
          class="text-sm text-red-500 dark:text-red-500"
          v-for="error in (errors.password || [])"
          :key="error"
          >{{ error }}</span
        >
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Password must be at least 8 characters and include uppercase,
          lowercase, number, and a special character (allowed: !@#$%^&*(),.?":{}|<>_-).
        </p>
        <p
          v-if="password && !passwordRequirementsMet"
          class="text-xs text-red-500 dark:text-red-500 mt-1"
        >
          Ensure your password meets all complexity requirements.
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
          id="confirmPassword"
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
  </PageCard>
</template>

<script setup lang="ts">
import PageCard from '@/components/PageCard.vue';
import { ref, computed, onMounted } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useRouter, useRoute } from 'vue-router';
import FormInput from '@/components/forms/FormInput.vue';
import { useToast } from 'primevue/usetoast';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';
import AuthFormHeader from '@/components/auth/AuthFormHeader.vue';

interface AuthError {
  password: string[];
  token: string[];
}

const password = ref('');
const confirmPassword = ref('');
const token = ref('');
const errors = ref<AuthError>({} as AuthError);
const isLoading = ref(false);
const tokenError = ref('');

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
  const pw = password.value;
  const cpw = confirmPassword.value;

  // No mismatch when both fields are empty (initial state)
  if (!pw && !cpw) {
    return false;
  }

  // Treat any difference (including empty confirm when password is set) as mismatch
  return pw !== cpw;
});

const passwordRequirementsMet = computed(() => {
  const value = password.value;
  if (!value) {
    return false;
  }
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%^&*(),.?":{}|<>_\-]/.test(value)
  );
});

function isValidBase64UrlSegment(segment: string) {
  if (!segment) {
    return false;
  }
  let normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) {
    normalized += '=';
  }

  try {
    atob(normalized);
    return true;
  } catch {
    return false;
  }
}

const isTokenFormatValid = computed(() => {
  if (!token.value) {
    return false;
  }

  const parts = token.value.split('.');
  if (parts.length !== 3) {
    return false;
  }

  return parts.every(isValidBase64UrlSegment);
});

const isFormValid = computed(() => {
  return (
    password.value &&
    confirmPassword.value &&
    !passwordMismatch.value &&
    passwordRequirementsMet.value &&
    isTokenFormatValid.value
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

  // If token is missing or invalid, redirect to forgot password
  if (!token.value || !isTokenFormatValid.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Reset Link',
      detail: 'This password reset link is invalid or has expired.',
      life: 4000,
    });
    tokenError.value =
      'This password reset link appears invalid or expired. Please request a new link.';
  }
});

async function onSubmit() {
  if (!isFormValid.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Form Submission',
      detail:
        'Please complete all required fields with valid values before resetting your password.',
      life: 4000,
    });
    return;
  }

  errors.value = {} as AuthError;
  isLoading.value = true;

  try {
    await resetPassword({
      data: {
        password: password.value,
        token: token.value,
      },
    });

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
    }, 5000);
  } catch (error) {
    const axiosError = error as AxiosError<DataResponse<AuthError>>;
    const status = axiosError.response?.status;

    if (axiosError.response?.data?.data) {
      errors.value = axiosError.response.data.data as AuthError;
    } else {
      let errorMessage: string;

      switch (status) {
        case 401:
          errorMessage =
            'This reset link is invalid or has expired. Please request a new password reset link.';
          break;
        case 422:
          errorMessage =
            'There was a problem with the information provided. Please review your input and try again.';
          break;
        case 500:
          errorMessage =
            'A server error occurred while resetting your password. Please try again later.';
          break;
        default:
          errorMessage = 'Unable to reset password. Please try again.';
      }

      console.error('Password reset failed', {
        status,
        data: axiosError.response?.data,
      });
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
