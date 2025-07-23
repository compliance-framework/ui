import { useConfigStore } from '@/stores/config.ts';
import { ref } from 'vue';

export function useFetch(req: Request): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const configStore = useConfigStore();
    configStore.getConfig().then((config) => {
      const url = new URL(req.url, window.location.origin);
      req.headers.set('Accept', 'application/json');
      req.headers.set('Content-Type', 'application/json');
      const request = new Request(`${config.API_URL}${url.pathname}${url.search}`, {
        method: req.method,
        headers: req.headers,
        credentials: 'include',
        body: req.body,
      });

      fetch(request).then((res: Response) => {
        if (res.ok) {
          return resolve(res);
        }
        return reject(res);
      });
    });
  });
}

export function useApi<T>(req: Request) {
  const data = ref<T>();
  const loading = ref<boolean>(true);
  const error = ref<boolean>(false);
  const response = ref<Response>();

  useFetch(req)
    .then((res: Response) => {
      response.value = res;
      if (!res.ok) {
        return Promise.reject(res)
      }
      error.value = false;
      res.json().then((k: T) => {
        data.value = k;
      });
    })
    .catch((res: Response) => {
      error.value = true;
      response.value = res;
    })
    .finally(() => {
      loading.value = false;
    });

  return { data, loading, error, response };
}
