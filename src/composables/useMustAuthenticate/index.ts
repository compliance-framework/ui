import { useRouter, useRoute } from 'vue-router';
import { type Ref, watch } from 'vue'

function gotoLogin() {
  const router = useRouter();
  const route = useRoute();
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
      return gotoLogin()
    }
  });
}

export function useMustAuthenticate() {
  return { gotoLogin, watchForUnauthenticated };
}
