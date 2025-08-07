import axios, { type AxiosInstance } from 'axios';
import { useConfigStore } from '@/stores/config.ts';
import { useUserStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';


const useApi = () => {
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

const useGuestApi = () => {
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

export { useApi, useGuestApi };
