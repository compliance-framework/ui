<script setup lang="ts">
/**
 * Forgot password (Guest template): sends a reset link by email. The script is the classic
 * page's.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';

interface AuthError {
  email: string[];
}

const email = ref('');
const errors = ref<AuthError>({} as AuthError);
const isLoading = ref(false);

const router = useRouter();
const toast = useToast();

const { execute: forgotPassword } = useGuestApi<string>(
  '/api/auth/forgot-password',
  {
    method: 'POST',
  },
  { immediate: false },
);

async function onSubmit() {
  errors.value = {} as AuthError;
  isLoading.value = true;
  try {
    await forgotPassword({
      data: {
        email: email.value,
      },
    });

    // Clear the form
    email.value = '';

    toast.add({
      severity: 'success',
      summary: 'Reset Link Sent',
      detail: 'Please check your email for password reset instructions.',
      life: 5000,
    });

    // Optionally redirect to login after a delay
    setTimeout(() => {
      router.push({ name: 'login' });
    }, 5000);
  } catch (error) {
    const response = error as AxiosError<DataResponse<AuthError>>;
    if (response.response?.data?.data) {
      errors.value = response.response.data.data as AuthError;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Request Failed',
        detail: 'Unable to send reset link. Please try again later.',
        life: 4000,
      });
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <GuestTemplate
    title="Reset your password"
    description="Enter your email address and we'll send you a link to reset your password."
  >
    <form novalidate @submit.prevent="onSubmit">
      <Stack gap="4">
        <FormField
          label="Email"
          :error="(errors.email || []).join(' ') || undefined"
        >
          <TextInput v-model="email" type="email" />
        </FormField>
        <Button variant="primary" type="submit" :loading="isLoading"
          >Send reset link</Button
        >
      </Stack>
    </form>
    <template #footer>
      <TextLink :to="{ name: 'login' }">Back to sign in</TextLink>
    </template>
  </GuestTemplate>
</template>
