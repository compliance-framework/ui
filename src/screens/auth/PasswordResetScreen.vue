<script setup lang="ts">
/**
 * Choose a new password (Guest template), from the emailed reset link's token. The script is the
 * classic page's; the form now shows what's wrong next to each field instead of a disabled button.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';

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
/** Field errors show once the form has been submitted. */
const attempted = ref(false);

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

  // A missing or malformed token is explained in place (the inline message), not in a toast.
  if (!token.value || !isTokenFormatValid.value) {
    tokenError.value =
      'This password reset link appears invalid or expired. Please request a new link.';
  }
});

async function onSubmit() {
  attempted.value = true;
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

const passwordError = computed(() => {
  const server = (errors.value.password || []).join(' ');
  if (server) return server;
  if (!attempted.value) return undefined;
  if (!password.value) return 'Enter a new password.';
  return passwordRequirementsMet.value
    ? undefined
    : "This password doesn't meet the requirements.";
});
const confirmError = computed(() =>
  attempted.value && passwordMismatch.value
    ? "The passwords don't match."
    : undefined,
);
</script>

<template>
  <GuestTemplate
    title="Choose a new password"
    description="Enter your new password below."
  >
    <InlineMessage
      v-if="tokenError"
      tone="error"
      title="This link doesn't work"
    >
      <p>{{ tokenError }}</p>
    </InlineMessage>
    <form novalidate @submit.prevent="onSubmit">
      <Stack gap="4">
        <FormField
          label="New password"
          hint="At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character."
          :error="passwordError"
        >
          <TextInput v-model="password" type="password" />
        </FormField>
        <FormField label="Confirm new password" :error="confirmError">
          <TextInput v-model="confirmPassword" type="password" />
        </FormField>
        <Button variant="primary" type="submit" :loading="isLoading"
          >Reset password</Button
        >
      </Stack>
    </form>
    <template #footer>
      <TextLink :to="{ name: 'login' }">Back to sign in</TextLink>
    </template>
  </GuestTemplate>
</template>
