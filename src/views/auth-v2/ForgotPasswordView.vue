<template>
  <AuthPanelCard>
    <header class="mb-5">
      <h1 class="ui-v2-title text-[var(--ui-v2-foreground)]">
        Forgot Password
      </h1>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Enter your email address. If it is registered, we will send a secure
        reset link.
      </p>
    </header>

    <template v-if="!isSent">
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label
            for="email"
            class="ui-v2-label mb-1 block text-[var(--ui-v2-secondary-foreground)]"
            >Email</label
          >
          <AuthInput
            id="email"
            v-model="email"
            autocomplete="email"
            placeholder="name@company.com"
            type="email"
          />
          <p
            v-for="error in errors.email || []"
            :key="error"
            class="ui-v2-meta mt-1 text-[var(--ui-v2-error)]"
          >
            {{ error }}
          </p>
        </div>

        <AuthPrimaryButton :disabled="isLoading" type="submit">
          <span v-if="isLoading">Sending...</span>
          <span v-else>Send Reset Link</span>
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

      <section
        class="mt-5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
      >
        <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
          What happens next
        </p>
        <ul class="ui-v2-nav space-y-2 text-[var(--ui-v2-foreground)]">
          <li class="flex items-start gap-3">
            <span class="font-bold text-[var(--ui-v2-primary)]">01</span>
            <span>We send a secure link to your email.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="font-bold text-[var(--ui-v2-primary)]">02</span>
            <span>Open it and set a new password.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="font-bold text-[var(--ui-v2-primary)]">03</span>
            <span>Sign in and continue where you left off.</span>
          </li>
        </ul>
      </section>
    </template>

    <template v-else>
      <div
        class="border border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] p-4 text-[var(--ui-v2-foreground)]"
      >
        Reset link sent. Check your inbox for next steps.
      </div>
      <p class="ui-v2-meta mt-4 text-[var(--ui-v2-muted-foreground)]">
        Redirecting to sign in in a few seconds.
      </p>
      <router-link
        :to="{ name: 'login' }"
        class="ui-v2-link ui-v2-nav mt-4 inline-block"
      >
        Back to Sign In Now
      </router-link>
    </template>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import { useGuestApi } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import AuthInput from '@/components/v2/auth/AuthInput.vue';
import AuthPanelCard from '@/components/v2/auth/AuthPanelCard.vue';
import AuthPrimaryButton from '@/components/v2/auth/AuthPrimaryButton.vue';

interface AuthError {
  email: string[];
}

const REDIRECT_DELAY_MS = 5000;

const email = ref('');
const errors = ref<AuthError>({} as AuthError);
const isLoading = ref(false);
const isSent = ref(false);

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

    isSent.value = true;
    toast.add({
      severity: 'success',
      summary: 'Reset Link Sent',
      detail: 'Please check your email for password reset instructions.',
      life: REDIRECT_DELAY_MS,
    });

    setTimeout(() => {
      router.push({ name: 'login' });
    }, REDIRECT_DELAY_MS);
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
