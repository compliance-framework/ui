import { useAuthenticatedInstance } from '@/composables/axios';
import { useUserStore } from '@/stores/auth';
import type { CCFUser, DataResponse } from '@/stores/types';

export function useAuthHydration() {
  const axios = useAuthenticatedInstance();
  const userStore = useUserStore();

  async function hydrateCurrentUser() {
    try {
      const response = await axios.get<DataResponse<CCFUser>>('/api/users/me');
      userStore.user = response.data.data;
      userStore.isAuthenticated = true;
      return userStore.user;
    } catch (error) {
      userStore.logout();
      throw error;
    }
  }

  return {
    hydrateCurrentUser,
  };
}
