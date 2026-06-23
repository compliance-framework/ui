import { useGuestInstance } from '@/composables/axios';
import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';
import type { CCFUser, DataResponse } from '@/stores/types';

export function useAuthHydration() {
  const axios = useGuestInstance();
  const userStore = useUserStore();
  const permissionsStore = usePermissionsStore();

  async function hydrateCurrentUser() {
    try {
      const response = await axios.get<DataResponse<CCFUser>>('/api/users/me');
      userStore.user = response.data.data;
      userStore.isAuthenticated = true;
      // Load the permission-aware UI hints (BCH-1318). Non-blocking: hydrate() swallows
      // its own errors so a permissions outage never breaks login (can() stays optimistic).
      await permissionsStore.hydrate();
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
