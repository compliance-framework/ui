import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config';
import type { DataResponse } from './types';
import { ref } from 'vue';

interface User {
  sub: string;
  givenName: string;
  familyName: string;
}

export interface AuthResponse {
  auth_token: string;
}

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      user: null as User | null,
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

export const useAuthStore = defineStore('auth', () => {
  const user = useUserStore();
  const configStore = useConfigStore();

  async function login(email: string, password: string): Promise<AuthResponse> {
    return new Promise<AuthResponse>(async (resolve, reject) => {
      const config = await configStore.getConfig();
      const response = await fetch(`${config.API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        credentials: 'include',
      });
      if (!response.ok) {
        return reject(response);
      }
      const data = (await response.json()) as DataResponse<AuthResponse>;
      user.isAuthenticated = true;
      return resolve(data.data);
    });
  }

  async function logout(): Promise<boolean> {
    user.isAuthenticated = false;
    return true;
  }

  return {
    login,
    logout,
  };
});
