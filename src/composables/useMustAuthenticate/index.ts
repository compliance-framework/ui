import { useRouter, useRoute } from 'vue-router';
import { type Ref, watch } from 'vue';

export const useMustAuthenticate = () => {
  const route = useRoute();
  const router = useRouter();

  function gotoLogin() {
    return router.push({
      name: 'login',
      query: {
        next: route.fullPath,
      },
    });
  }

  function watchForUnauthenticated(response: Ref<Response | undefined>) {
    return watch(response, () => {
      if (response.value?.status === 401) {
        return gotoLogin();
      }
    });
  }

  return {
    gotoLogin,
    watchForUnauthenticated,
  };
};
