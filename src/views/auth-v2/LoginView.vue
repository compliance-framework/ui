<template>
  <AuthPanelCard>
    <div
      v-if="loginNotice"
      class="mb-5 border border-[var(--ui-v2-primary-stroke-30)] bg-[var(--ui-v2-primary-tint-10)] px-3 py-2 text-[var(--ui-v2-foreground)]"
    >
      {{ loginNotice }}
    </div>

    <header class="mb-4">
      <h1
        class="ui-v2-display text-[34px] font-bold uppercase leading-none tracking-[-0.02em] text-[var(--ui-v2-foreground)]"
      >
        Sign In
      </h1>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Use email and password or sign in securely with SSO.
      </p>
    </header>

    <p
      v-if="formError"
      class="mb-4 border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 py-2 text-[var(--ui-v2-error)]"
    >
      {{ formError }}
    </p>

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

      <div>
        <label
          for="password"
          class="ui-v2-label mb-1 block text-[var(--ui-v2-secondary-foreground)]"
          >Password</label
        >
        <AuthInput
          id="password"
          v-model="password"
          autocomplete="current-password"
          placeholder="********"
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

      <AuthPrimaryButton :disabled="isLoading" type="submit">
        <span v-if="isLoading">Signing in...</span>
        <span v-else>Sign In</span>
      </AuthPrimaryButton>
    </form>

    <div
      class="ui-v2-nav mt-4 flex items-center justify-between border-t border-[var(--ui-v2-border)] pt-3"
    >
      <router-link :to="{ name: 'forgot-password' }" class="ui-v2-link">
        Forgot Password?
      </router-link>
      <span class="text-[var(--ui-v2-tertiary-foreground)]"
        >Go to recovery</span
      >
    </div>

    <p
      class="ui-v2-label my-4 text-center text-[var(--ui-v2-secondary-foreground)]"
    >
      Or continue auth with
    </p>

    <div class="space-y-2">
      <template v-if="hasSSOProviders">
        <button
          v-for="provider in ssoProviders"
          :key="provider.name"
          :disabled="isSSOLoading"
          class="ui-v2-nav flex w-full items-center justify-between border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-left text-[var(--ui-v2-foreground)] transition-colors hover:border-[var(--ui-v2-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          @click="loginWithSSO(provider.name)"
        >
          <span class="flex items-center gap-2">
            <span
              class="ui-v2-meta flex h-6 w-6 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] leading-none font-semibold text-[var(--ui-v2-foreground)]"
            >
              <img
                v-if="provider.iconUrl"
                :alt="`${formatProviderLabel(provider)} logo`"
                :src="provider.iconUrl"
                class="h-4 w-4 object-contain"
                loading="lazy"
              />
              <span v-else>{{ providerInitials(provider) }}</span>
            </span>
            Continue with {{ formatProviderLabel(provider) }}
          </span>
          <span class="text-[var(--ui-v2-tertiary-foreground)]">&gt;</span>
        </button>
      </template>

      <div
        v-else
        class="border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-muted-foreground)]"
      >
        No SSO providers are configured for this environment. Please use email
        and password or contact your administrator.
      </div>

      <p
        v-if="ssoError"
        class="border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 py-2 text-[var(--ui-v2-error)]"
      >
        {{ ssoError }}
      </p>
    </div>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import { useGuestApi } from '@/composables/axios';
import { useOIDC, type OIDCProvider } from '@/composables/useOIDC';
import { useUserStore } from '@/stores/auth';
import type { DataResponse } from '@/stores/types';
import AuthInput from '@/components/v2/auth/AuthInput.vue';
import AuthPanelCard from '@/components/v2/auth/AuthPanelCard.vue';
import AuthPrimaryButton from '@/components/v2/auth/AuthPrimaryButton.vue';

interface AuthError {
  email: string[];
  password: string[];
}

const email = ref('');
const password = ref('');
const errors = ref<AuthError>({} as AuthError);
const formError = ref<string | null>(null);
const isLoading = ref(false);

const user = useUserStore();
const {
  providers: ssoProviders,
  isLoading: isSSOLoading,
  error: ssoError,
  loadProviders,
  initiateLogin,
} = useOIDC();

const loginNotice = ref<string | null>(null);
const hasSSOProviders = computed(() => (ssoProviders.value?.length ?? 0) > 0);

const { execute: login } = useGuestApi<DataResponse<AuthError>>(
  '/api/auth/login',
  {
    method: 'POST',
  },
  { immediate: false },
);

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loginWithSSO = async (providerName: string) => {
  try {
    await initiateLogin(providerName);
  } catch (err) {
    console.error('SSO login failed to start', err);
    toast.add({
      severity: 'error',
      summary: 'SSO unavailable',
      detail:
        err instanceof Error ? err.message : 'Unable to start the SSO flow.',
      life: 4000,
    });
  }
};

const formatProviderLabel = (provider: OIDCProvider) => {
  if (provider.displayName) {
    return provider.displayName;
  }
  return provider.name.charAt(0).toUpperCase() + provider.name.slice(1);
};

const providerInitials = (provider: OIDCProvider) => {
  const label = formatProviderLabel(provider);
  const parts = label.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const loginErrorMessages: Record<string, string> = {
  missing_group:
    'Your SSO account is missing the required access groups. Please contact an administrator to gain access.',
  provider_disabled:
    'This SSO provider is currently disabled. Please try another option or contact an administrator.',
  session_expired:
    'Your SSO session expired before completing sign-in. Please try again.',
};

const resolveLoginNotice = () => {
  const errorQuery = route.query.error;
  const errorCode = Array.isArray(errorQuery) ? errorQuery[0] : errorQuery;
  if (errorCode && typeof errorCode === 'string') {
    loginNotice.value =
      loginErrorMessages[errorCode] ??
      `We could not complete your SSO sign-in (code: ${errorCode}). Please try again or contact an administrator.`;
  } else {
    loginNotice.value = null;
  }
};

watch(
  () => route.query.error,
  () => resolveLoginNotice(),
  { immediate: true },
);

onMounted(() => {
  loadProviders();
});

async function onSubmit() {
  errors.value = {} as AuthError;
  formError.value = null;
  isLoading.value = true;
  try {
    await login({
      data: {
        email: email.value,
        password: password.value,
      },
    });
    user.isAuthenticated = true;
    if (route.query.hasOwnProperty('next')) {
      return router.push(route.query.next as string);
    }
    return router.push({ name: 'home' });
  } catch (error) {
    const response = error as AxiosError<DataResponse<AuthError>>;
    if (response.status === 401) {
      const errorResponse = response.response?.data;
      errors.value = errorResponse?.data as AuthError;
      if (!errors.value?.email?.length && !errors.value?.password?.length) {
        formError.value = 'Invalid credentials. Please verify and try again.';
      }
      return;
    }

    formError.value =
      'Unable to sign in right now. Please try again in a moment.';
  } finally {
    isLoading.value = false;
  }
}
</script>
