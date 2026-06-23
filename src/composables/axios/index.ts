import axios, { type AxiosInstance } from 'axios';
import { useConfigStore } from '@/stores/config.ts';
import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type {
  UseAxiosOptions,
  UseAxiosOptionsWithInitialData,
} from '@vueuse/integrations/useAxios';
import type { AxiosHeaders, AxiosRequestConfig } from 'axios';
import type { DataResponse } from '@/stores/types.ts';
import { shallowRef, toValue, watch, type Ref } from 'vue';
import { useAxios } from '@vueuse/integrations/useAxios';
import camelcaseKeys from 'camelcase-keys';
import { default as _decamelizeKeys } from 'decamelize-keys';

declare module 'axios' {
  interface AxiosRequestConfig {
    // Object paths whose child keys should be left untouched by the response
    // camelcase conversion (e.g. arbitrary label maps that may use snake_case
    // or `_`-prefixed keys we need to preserve verbatim).
    camelcaseStopPaths?: readonly string[];
  }
}

// Throttle the global 403 toast so a single user action that fans out into N requests
// surfaces one "Permission denied" message instead of N. Module-level = shared across every
// authenticated instance created by useDataApi.
let last403ToastAt = 0;
const PERMISSION_TOAST_INTERVAL_MS = 3000;

const useAuthenticatedInstance = () => {
  const userStore = useUserStore();
  const permissionsStore = usePermissionsStore();
  const configStore = useConfigStore();
  const router = useRouter();
  const toast = useToast();
  let cachedURL = '';

  const instance: AxiosInstance = axios.create({
    withCredentials: true,
  });

  instance.interceptors.request.use(
    async (config) => {
      if (!cachedURL) {
        cachedURL = await configStore.getConfig().then((c) => c.API_URL);
      }
      config.baseURL = cachedURL;

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        userStore.logout();
        toast.add({
          severity: 'error',
          summary: 'Authentication Error',
          detail:
            'You have been logged out due to inactivity or invalid credentials. Please log in again.',
          life: 3000,
        });
        router.push({ name: 'login' });
      } else if (error.response && error.response.status === 403) {
        // Graceful fallback for the permission-aware UI (BCH-1318): the PDP is the source
        // of truth, so a 403 can still occur where a cosmetic hint allowed the action
        // (e.g. a stale permission cache, or an instance-level deny the type-level hint
        // can't express). Surface it kindly and resync the permission map.
        //
        // Both are de-duplicated so a fanned-out batch of denials doesn't spam the user:
        // the toast is throttled here, and hydrate() collapses concurrent calls into one
        // GET /api/me/permissions.
        const now = Date.now();
        if (now - last403ToastAt > PERMISSION_TOAST_INTERVAL_MS) {
          last403ToastAt = now;
          toast.add({
            severity: 'warn',
            summary: 'Permission denied',
            detail: "You don't have permission to perform this action.",
            life: 4000,
          });
        }
        permissionsStore.hydrate();
      }
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      // Brute force camelcase conversion. OSCAL apis are all kebab-case so should be converted to
      // camel case, but any manually written APIs will be camel case and therefore won't change
      if (response.data) {
        const stopPaths = response.config?.camelcaseStopPaths;
        response.data = camelcaseKeys(response.data, {
          deep: true,
          ...(stopPaths ? { stopPaths: [...stopPaths] } : {}),
        });
      }
      return response;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  return instance;
};

const useGuestInstance = () => {
  const configStore = useConfigStore();
  let cachedURL = '';

  const instance: AxiosInstance = axios.create({
    withCredentials: true,
  });

  instance.interceptors.request.use(
    async (config) => {
      if (!cachedURL) {
        cachedURL = await configStore.getConfig().then((c) => c.API_URL);
      }
      config.baseURL = cachedURL;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  return instance;
};

function useDataApi<T>(
  url?: Ref | string | null,
  config?: AxiosRequestConfig | null,
  options?:
    | UseAxiosOptions
    | UseAxiosOptionsWithInitialData<DataResponse<T>>
    | null,
) {
  const instance = useAuthenticatedInstance();
  const ax = useAxios<DataResponse<T>>(
    toValue(url) ?? '',
    config ?? ({} as AxiosRequestConfig),
    instance,
    options ?? ({ immediate: true } as UseAxiosOptions),
  );

  let initialData: T | undefined = undefined;
  if (options && 'initialData' in options) {
    initialData = options.initialData as T;
  }

  const data = shallowRef<T | undefined>(initialData);

  watch(
    ax.data,
    (val) => {
      data.value = val?.data ?? initialData;
    },
    { immediate: true },
  );

  return {
    ...ax,
    data,
  };
}

function useGuestApi<T>(
  url?: Ref | string | null,
  config?: AxiosRequestConfig | null,
  options?:
    | UseAxiosOptions
    | UseAxiosOptionsWithInitialData<DataResponse<T>>
    | null,
) {
  const instance = useGuestInstance();
  const ax = useAxios<DataResponse<T>>(
    toValue(url) ?? '',
    config ?? ({} as AxiosRequestConfig),
    instance,
    options ?? ({ immediate: true } as UseAxiosOptions),
  );

  let initialData: T | undefined = undefined;
  if (options && 'initialData' in options) {
    initialData = options.initialData as T;
  }

  const data = shallowRef<T | undefined>(initialData);

  watch(
    ax.data,
    (val) => {
      data.value = val?.data ?? initialData;
    },
    { immediate: true },
  );

  return {
    ...ax,
    data,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decamelizeKeys = (data: any, headers: AxiosHeaders) => {
  // Enforce Content-Type header for JSON data
  headers.set('Content-Type', 'application/json');

  return JSON.stringify(_decamelizeKeys(data, { separator: '-', deep: true }));
};

export {
  useAuthenticatedInstance,
  useGuestInstance,
  useDataApi,
  useGuestApi,
  decamelizeKeys,
};
