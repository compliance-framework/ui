<script setup lang="ts">
/**
 * Sign in (Guest template): email and password, then any configured SSO providers. The script is
 * the classic sign-in page's, except that a failed sign-in is explained above the form rather than
 * in a toast, and the banner severity is mapped to a design-system tone.
 */
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useGuestApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useOIDC, type OIDCProvider } from '@/composables/useOIDC';
import { useAuthHydration } from '@/composables/useAuthHydration';
import { resolveAuthNextLocation } from '@/utils/auth-redirect';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import type { MessageTone } from '@/ds/components/InlineMessage/tone';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';
import { useConfigStore, type LoginBannerSeverity } from '@/stores/config';

interface AuthError {
  email: string[];
  password: string[];
}

const email = ref('');
const password = ref('');
const errors = ref<AuthError>(createDefaultAuthErrors());
/** Why the last sign-in failed, shown above the form. */
const loginFailed = ref('');

const { hydrateCurrentUser } = useAuthHydration();
const {
  providers: ssoProviders,
  isLoading: isSSOLoading,
  error: ssoError,
  loadProviders,
  initiateLogin,
} = useOIDC();

const loginNotice = ref<string | null>(null);
const loginBanner = ref('');
const loginBannerSeverity = ref<LoginBannerSeverity>('info');
const showLoginBanner = ref(false);
// TODO: Once other areas need this, move the "no SSO providers" UX into useOIDC or a shared helper.
const hasSSOProviders = computed(() => (ssoProviders.value?.length ?? 0) > 0);

const { execute: login } = useGuestApi<AuthError>(
  '/api/auth/login',
  {
    method: 'POST',
  },
  { immediate: false },
);

const route = useRoute();
const router = useRouter();
const toast = useToast();
const configStore = useConfigStore();

function createDefaultAuthErrors(): AuthError {
  return {
    email: [],
    password: [],
  };
}

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

const loginBannerDismissalKeyPrefix = 'login-banner-dismissed:';
const getLoginBannerDismissalKey = (message: string) =>
  `${loginBannerDismissalKeyPrefix}${encodeURIComponent(message)}`;

function clearLoginBannerDismissals() {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(loginBannerDismissalKeyPrefix)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
}

async function loadLoginBanner() {
  try {
    const config = await configStore.getConfig();
    const message = config.LOGIN_BANNER ?? '';

    loginBanner.value = message;
    loginBannerSeverity.value = config.LOGIN_BANNER_SEVERITY ?? 'info';
    showLoginBanner.value =
      message.length > 0 &&
      localStorage.getItem(getLoginBannerDismissalKey(message)) !== 'true';
  } catch {
    loginBanner.value = '';
    loginBannerSeverity.value = 'info';
    showLoginBanner.value = false;
  }
}

function dismissLoginBanner() {
  if (loginBanner.value.length > 0) {
    clearLoginBannerDismissals();
    localStorage.setItem(getLoginBannerDismissalKey(loginBanner.value), 'true');
  }
  showLoginBanner.value = false;
}

watch(
  () => route.query.error,
  () => resolveLoginNotice(),
  { immediate: true },
);

onMounted(() => {
  loadProviders();
  void loadLoginBanner();
});

function isAuthError(value: unknown): value is AuthError {
  if (!value || typeof value !== 'object') return false;

  const maybeAuthError = value as Partial<AuthError>;
  return (
    Array.isArray(maybeAuthError.email) &&
    maybeAuthError.email.every((error) => typeof error === 'string') &&
    Array.isArray(maybeAuthError.password) &&
    maybeAuthError.password.every((error) => typeof error === 'string')
  );
}

function normalizeAuthErrors(value: unknown): AuthError {
  if (!isAuthError(value)) return createDefaultAuthErrors();

  return {
    email: Array.isArray(value.email) ? value.email : [],
    password: Array.isArray(value.password) ? value.password : [],
  };
}

function showLoginFailed(error: unknown) {
  const response = error as AxiosError<unknown>;
  if (response.response?.status === 401) {
    const responseData = response.response.data;
    const authErrors =
      responseData && typeof responseData === 'object' && 'data' in responseData
        ? responseData.data
        : responseData;

    errors.value = normalizeAuthErrors(authErrors);
  }

  loginFailed.value =
    response.response?.status === 401
      ? "Those details don't match an account. Check your email and password."
      : "We couldn't sign you in. Try again in a moment.";
}

function showHydrationFailed() {
  toast.add({
    severity: 'error',
    summary: 'Unable to Load Account',
    detail:
      'Your credentials were accepted, but we could not load your account details. Please try again.',
    life: 3000,
  });
}

async function onSubmit() {
  errors.value = createDefaultAuthErrors();
  loginFailed.value = '';

  try {
    await login({
      data: {
        email: email.value,
        password: password.value,
      },
    });
  } catch (error) {
    showLoginFailed(error);
    return;
  }

  try {
    await hydrateCurrentUser();
  } catch {
    showHydrationFailed();
    return;
  }

  toast.add({
    severity: 'success',
    summary: 'Login Successful',
    detail: 'You have successfully logged in.',
    life: 3000,
  });
  return router.push(resolveAuthNextLocation(route.query.next));
}

/** The configured banner severity in design-system tones. */
const bannerTone = computed<MessageTone>(() => {
  const severity = loginBannerSeverity.value as string;
  if (severity === 'warn') return 'warning';
  if (severity === 'error' || severity === 'success') return severity;
  return 'info';
});
</script>

<template>
  <GuestTemplate title="Sign in">
    <InlineMessage
      v-if="showLoginBanner"
      :tone="bannerTone"
      data-testid="login-banner"
      :data-severity="loginBannerSeverity"
    >
      <p>{{ loginBanner }}</p>
      <template #dismiss>
        <IconButton
          icon="close"
          label="Dismiss message"
          size="sm"
          @click="dismissLoginBanner"
        />
      </template>
    </InlineMessage>

    <form novalidate @submit.prevent="onSubmit">
      <Stack gap="4">
        <InlineMessage v-if="loginFailed" tone="error" title="Not signed in">
          <p>{{ loginFailed }}</p>
        </InlineMessage>
        <FormField label="Email" :error="errors.email.join(' ') || undefined">
          <TextInput v-model="email" type="email" placeholder="Email" />
        </FormField>
        <FormField
          label="Password"
          :error="errors.password.join(' ') || undefined"
        >
          <TextInput
            v-model="password"
            type="password"
            placeholder="Password"
          />
        </FormField>
        <Button variant="primary" type="submit">Sign in</Button>
        <Text variant="caption"
          ><TextLink :to="{ name: 'forgot-password' }"
            >Forgot your password?</TextLink
          ></Text
        >
      </Stack>
    </form>

    <Stack gap="3">
      <Text variant="caption">Or continue with single sign-on</Text>
      <template v-if="hasSSOProviders">
        <Button
          v-for="provider in ssoProviders"
          :key="provider.name"
          :loading="isSSOLoading"
          @click="loginWithSSO(provider.name)"
          >Continue with {{ formatProviderLabel(provider) }}</Button
        >
      </template>
      <Text v-else variant="caption"
        >No single sign-on providers are set up here. Sign in with your email
        and password, or ask your administrator.</Text
      >
      <InlineMessage v-if="loginNotice" tone="warning">
        <p>{{ loginNotice }}</p>
      </InlineMessage>
      <InlineMessage v-if="ssoError" tone="error">
        <p>{{ ssoError }}</p>
      </InlineMessage>
    </Stack>
  </GuestTemplate>
</template>
