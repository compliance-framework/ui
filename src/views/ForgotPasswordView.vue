<template>
  <PageCard class="mx-auto mt-12 max-w-96 py-8 space-y-6">
    <AuthFormHeader
      title="Forgot Password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
    />

    <form @submit.prevent="onSubmit" class="space-y-4 px-8">
      <div>
        <label
          for="email"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Email</label
        >
        <FormInput
          v-model="email"
          placeholder="Enter your email"
          type="email"
          id="email"
        />
        <span
          class="text-sm text-red-500 dark:text-red-500"
          v-for="error in errors.email || []"
          :key="error"
          >{{ error }}</span
        >
      </div>
      <div>
        <PrimaryButton type="submit" class="w-full" :disabled="isLoading">
          <span v-if="isLoading">Sending...</span>
          <span v-else>Send Reset Link</span>
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
import { ref } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useRouter } from 'vue-router';
import FormInput from '@/components/forms/FormInput.vue';
import { useToast } from 'primevue/usetoast';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';
import AuthFormHeader from '@/components/auth/AuthFormHeader.vue';

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
