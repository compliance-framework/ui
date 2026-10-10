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
      <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
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
            required
            :aria-invalid="Boolean(errors.email?.length)"
            :aria-describedby="errors.email?.length ? 'email-error' : undefined"
          />
          <p
            v-for="error in errors.email || []"
            id="email-error"
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
        role="status"
        class="border border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] p-4 text-[var(--ui-v2-foreground)]"
      >
        If an account exists for {{ email.trim() }}, we have sent a reset link.
        Check your inbox for next steps.
      </div>
      <router-link
        :to="{ name: 'login' }"
        class="ui-v2-link ui-v2-nav mt-4 inline-block"
      >
        Back to Sign In
      </router-link>
    </template>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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

const email = ref('');
const errors = ref<AuthError>({} as AuthError);
const isLoading = ref(false);
const isSent = ref(false);

const toast = useToast();

// Anti-enumeration only applies to a well-formed address: an empty or
// malformed one is rejected here instead of claiming a link was sent.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const { execute: forgotPassword } = useGuestApi<string>(
  '/api/auth/forgot-password',
  {
    method: 'POST',
  },
  { immediate: false },
);

async function onSubmit() {
  const address = email.value.trim();
  if (!address) {
    errors.value = { email: ['Email is required.'] };
    return;
  }
  if (!EMAIL_PATTERN.test(address)) {
    errors.value = { email: ['Enter a valid email address.'] };
    return;
  }
  errors.value = {} as AuthError;
  isLoading.value = true;
  try {
    await forgotPassword({
      data: {
        email: address,
      },
    });

    // One success message, and the user stays on the page to read it.
    isSent.value = true;
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
