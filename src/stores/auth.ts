import { defineStore } from "pinia";
import { useConfigStore } from "@/stores/config";
import type { DataResponse } from "./types";
import { ref } from "vue";

interface User {
  sub: string;
  givenName: string;
  familyName: string;
}

export interface AuthResponse {
  auth_token: string;
}

export const useUserStore = defineStore("user", {
  state: () => {
    return {
      user: null as User | null,
      isAuthenticated: ref<boolean>(false),
      token: null as string | null
    }
  },
  persist: true
});

export const useAuthStore = defineStore("auth", () => {
  const user = useUserStore();
  const configStore = useConfigStore();

  async function login(email: string, password: string): Promise<AuthResponse> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    const data = (await response.json()) as DataResponse<AuthResponse>;
    user.token = data.data.auth_token;
    user.isAuthenticated = true;
    return data.data
  }

  async function logout(): Promise<boolean> {
    user.token = null
    user.isAuthenticated = false
    return true;
  }

  return {
    login,
    logout,
  }
});
