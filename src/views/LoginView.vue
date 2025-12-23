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
    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label
          for="email"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Email</label
        >
        <FormInput v-model="email" placeholder="Email" />
        <span
          class="text-sm text-red-500 dark:text-red-500"
          v-for="error in errors.email"
          :key="error"
          >{{ error }}</span
        >
      </div>
      <div>
        <label
          for="password"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Password</label
        >
        <FormInput v-model="password" placeholder="Password" type="password" />
        <span
          class="dark:text-red-500"
          v-for="error in errors.password"
          :key="error"
          >{{ error }}</span
        >
      </div>
      <div>
        <PrimaryButton type="submit" class="w-full"> Login </PrimaryButton>
      </div>
    </form>

    <!-- SSO Divider -->
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span
          class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        >
          Or continue with
        </span>
      </div>
    </div>

    <!-- SSO Buttons -->
    <div class="space-y-3 px-8">
      <template v-if="hasSSOProviders">
        <button
          v-for="provider in ssoProviders"
          :key="provider.name"
          @click="loginWithSSO(provider.name)"
          :disabled="isSSOLoading"
          class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span
            class="mr-2 flex h-6 w-6 items-center justify-center rounded bg-white/90 text-gray-700 shadow-sm dark:bg-slate-200 dark:text-gray-900"
          >
            <img
              v-if="provider.iconUrl"
              :src="provider.iconUrl"
              :alt="`${formatProviderLabel(provider)} logo`"
              class="h-5 w-5 object-contain"
              loading="lazy"
            />
            <span v-else class="text-xs font-semibold">
              {{ providerInitials(provider) }}
            </span>
          </span>
          Continue with {{ formatProviderLabel(provider) }}
        </button>
      </template>
      <template v-else>
        <div
          class="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300"
        >
          No SSO providers are configured for this environment. Please use the
          form above or contact your administrator.
        </div>
      </template>

      <div
        v-if="loginNotice"
        class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      >
        {{ loginNotice }}
      </div>

      <div v-if="ssoError" class="text-sm text-red-500">
        {{ ssoError }}
      </div>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import PageCard from '@/components/PageCard.vue';
import { ref, onMounted, watch, computed } from 'vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useUserStore } from '@/stores/auth';
import { useRoute, useRouter } from 'vue-router';
// import type { DataResponse } from '@/stores/api.ts';
import FormInput from '@/components/forms/FormInput.vue';
import lightLogo from '@/assets/logo-light.svg';
import darkLogo from '@/assets/logo-dark.svg';
import SideNavLogo from '@/components/navigation/SideNavLogo.vue';
import { useToast } from 'primevue/usetoast';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse } from '@/stores/types';
import { useOIDC, type OIDCProvider } from '@/composables/useOIDC';

interface AuthError {
  email: string[];
  password: string[];
}

const email = ref('');
const password = ref('');
const errors = ref<AuthError>({} as AuthError);

const user = useUserStore();
const {
  providers: ssoProviders,
  isLoading: isSSOLoading,
  error: ssoError,
  loadProviders,
  initiateLogin,
} = useOIDC();

const loginNotice = ref<string | null>(null);
// TODO: Once other areas need this, move the "no SSO providers" UX into useOIDC or a shared helper.
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
  try {
    await login({
      data: {
        email: email.value,
        password: password.value,
      },
    });
    user.isAuthenticated = true;

    toast.add({
      severity: 'success',
      summary: 'Login Successful',
      detail: 'You have successfully logged in.',
      life: 3000,
    });
    if (route.query.hasOwnProperty('next')) {
      return router.push(route.query.next as string);
    }
    return router.push({ name: 'home' });
  } catch (error) {
    const response = error as AxiosError<DataResponse<AuthError>>;
    if (response.status === 401) {
      const errorResponse = response.response?.data;
      errors.value = errorResponse?.data as AuthError;
    }

    toast.add({
      severity: 'error',
      summary: 'Login Failed',
      life: 3000,
    });
  }
}
</script>
