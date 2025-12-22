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
      <button
        v-for="provider in ssoProviders"
        :key="provider.name"
        @click="loginWithSSO(provider.name)"
        :disabled="isSSOLoading"
        class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <img
          v-if="provider.iconUrl"
          :src="provider.iconUrl"
          :alt="`${formatProviderLabel(provider)} logo`"
          class="mr-2 h-5 w-5"
        />
        <template v-else>
          <svg
            v-if="provider.name === 'google'"
            class="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            />
          </svg>
        </template>
        Continue with {{ formatProviderLabel(provider) }}
      </button>

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
import { ref, onMounted, watch } from 'vue';
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

const loginWithSSO = (providerName: string) => {
  initiateLogin(providerName);
};

const formatProviderLabel = (provider: OIDCProvider) => {
  if (provider.displayName) {
    return provider.displayName;
  }
  return provider.name.charAt(0).toUpperCase() + provider.name.slice(1);
};

const resolveLoginNotice = () => {
  const errorQuery = route.query.error;
  const errorCode = Array.isArray(errorQuery) ? errorQuery[0] : errorQuery;
  if (errorCode === 'missing_group') {
    loginNotice.value =
      'Your SSO account is missing the required access groups. Please contact an administrator to gain access.';
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
  resolveLoginNotice();
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
