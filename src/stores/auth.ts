import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CCFUser } from '@/stores/types';
import { usePermissionsStore } from '@/stores/permissions';

export interface AuthResponse {
  auth_token: string;
}

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      user: null as CCFUser | null,
      isAuthenticated: ref<boolean>(false),
    };
  },
  actions: {
    logout() {
      this.isAuthenticated = false;
      this.user = null;
      // Clear permission hints so the next user doesn't inherit them (BCH-1318).
      usePermissionsStore().reset();
    },
  },
  persist: true,
});
