import axios, { type AxiosInstance } from 'axios';
import { useConfigStore } from '@/stores/config.ts';
import { useUserStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { UseAxiosOptions, UseAxiosOptionsWithInitialData } from '@vueuse/integrations/useAxios.mjs';
import type { AxiosRequestConfig } from 'axios';
import type { DataResponse } from '@/stores/types.ts';
import { shallowRef, toValue, watch, type Ref } from 'vue';
import { useAxios } from '@vueuse/integrations/useAxios.mjs';


const useAuthenticatedInstance = () => {
  const userStore = useUserStore();
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
        cachedURL = await configStore.getConfig().then(c => c.API_URL);
      }
      config.baseURL = cachedURL;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response && error.response.status === 401) {
        userStore.logout();
        toast.add({
          severity: 'error',
          summary: 'Authentication Error',
          detail: 'You have been logged out due to inactivity or invalid credentials. Please log in again.',
          life: 3000,
        });
        router.push({ name: 'login' });
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const useGuestInstance = () => {
  const configStore = useConfigStore();
  let cachedURL = '';

  const instance: AxiosInstance = axios.create();

  instance.interceptors.request.use(
    async (config) => {
      if (!cachedURL) {
        cachedURL = await configStore.getConfig().then(c => c.API_URL);
      }
      config.baseURL = cachedURL;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

function useDataApi<T>(
  url?: Ref | string | null,
  config?: AxiosRequestConfig | null,
  options?: UseAxiosOptions | UseAxiosOptionsWithInitialData<DataResponse<T>> | null,
) {
  const instance = useAuthenticatedInstance();
  const ax = useAxios<DataResponse<T>>(
    toValue(url) ?? "",
    config ?? {} as AxiosRequestConfig,
    instance,
    options ?? { immediate: true } as UseAxiosOptions
  );

  let initialData: T;
  if (options && 'initialData' in options) {
    initialData = options.initialData as T;
  } else {
    initialData = {} as T;
  }

  const data = shallowRef<T>(initialData);

  watch(
    ax.data,
    (val) => { data.value = val?.data ?? initialData; },
    { immediate: true }
  );

  return {
    ...ax,
    data,
  }
}


export { useAuthenticatedInstance, useGuestInstance, useDataApi };
