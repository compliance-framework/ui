import { defineStore } from "pinia";
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
    }
  },
  actions: {
    logout() {
      this.isAuthenticated = false;
      this.user = null;
    }
  },
  persist: true
});
