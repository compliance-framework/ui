<template>
  <AuthPanelCard>
    <header class="mb-5">
      <h1
        class="ui-v2-display text-[34px] font-bold uppercase leading-none tracking-[-0.02em] text-[var(--ui-v2-foreground)]"
      >
        Set a New Password
      </h1>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Create a strong password for secure access to your workspace.
      </p>
    </header>

    <div
      v-if="tokenError"
      class="mb-4 border border-[var(--ui-v2-info)] bg-[var(--ui-v2-info-tint-10)] p-3 text-[var(--ui-v2-foreground)]"
    >
      {{ tokenError }}
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label
          for="password"
          class="ui-v2-label mb-1 block text-[var(--ui-v2-secondary-foreground)]"
          >New Password</label
        >
        <AuthInput
          id="password"
          v-model="password"
          autocomplete="new-password"
          placeholder="Enter a strong password"
          type="password"
        />
        <p
          v-for="error in errors.password || []"
          :key="error"
          class="ui-v2-meta mt-1 text-[var(--ui-v2-error)]"
        >
          {{ error }}
        </p>
      </div>

      <div>
        <label
          for="confirmPassword"
          class="ui-v2-label mb-1 block text-[var(--ui-v2-secondary-foreground)]"
          >Confirm Password</label
        >
        <AuthInput
          id="confirmPassword"
          v-model="confirmPassword"
          autocomplete="new-password"
          placeholder="Confirm password"
          type="password"
        />
        <p
          v-if="passwordMismatch"
          class="ui-v2-meta mt-1 text-[var(--ui-v2-error)]"
        >
          Passwords do not match.
        </p>
      </div>

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
      >
        <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
          Password Requirements
        </p>
        <ul class="ui-v2-nav space-y-1 text-[var(--ui-v2-foreground)]">
          <li>- At least 8 characters</li>
          <li>- One uppercase and one lowercase letter</li>
          <li>- One number and one special character</li>
        </ul>
        <p
          v-if="password && !passwordRequirementsMet"
          class="ui-v2-meta mt-2 text-[var(--ui-v2-error)]"
        >
          Ensure your password meets all complexity requirements.
        </p>
      </section>

      <AuthPrimaryButton :disabled="isLoading || !isFormValid" type="submit">
        <span v-if="isLoading">Resetting...</span>
        <span v-else>Reset Password</span>
      </AuthPrimaryButton>
    </form>

    <div
      class="ui-v2-nav mt-4 flex items-center justify-between border-t border-[var(--ui-v2-border)] pt-3"
    >
      <router-link :to="{ name: 'login' }" class="ui-v2-link">
        Back to Sign In
      </router-link>
      <span class="text-[var(--ui-v2-tertiary-foreground)]"
        >Keep help contact support</span
      >
    </div>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import { useGuestApi } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import AuthInput from '@/components/v2/auth/AuthInput.vue';
import AuthPanelCard from '@/components/v2/auth/AuthPanelCard.vue';
import AuthPrimaryButton from '@/components/v2/auth/AuthPrimaryButton.vue';

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

  if (!pw && !cpw) {
    return false;
  }

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
  const tokenParam = route.query.token;
  if (typeof tokenParam === 'string') {
    token.value = tokenParam;
  } else if (Array.isArray(tokenParam)) {
    token.value = tokenParam[0] || '';
  }

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
