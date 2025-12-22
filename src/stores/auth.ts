import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CCFUser } from '@/stores/types';

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
    },
  },
  persist: true,
});
