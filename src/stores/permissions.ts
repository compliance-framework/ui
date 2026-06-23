import { defineStore } from 'pinia';
import { useGuestInstance } from '@/composables/axios';

export interface PermissionSubject {
  type: string;
  id: string;
}

// Response shape of GET /api/me/permissions (compliance-framework/api:
// internal/api/handler/permissions.go). NOTE: this endpoint is NOT wrapped in the
// `{ data: ... }` envelope used elsewhere — the handler returns this struct directly.
export interface PermissionsResponse {
  subject: PermissionSubject;
  permissions: Record<string, string[]>;
}

export const usePermissionsStore = defineStore('permissions', {
  state: () => ({
    subject: null as PermissionSubject | null,
    // resource -> allowed actions. Every manifest resource is always present (the API
    // pre-seeds an empty list), so absence of an action means "not allowed".
    permissions: {} as Record<string, string[]>,
    loaded: false,
  }),
  getters: {
    // Parameterised getter: can(resource, action). Reactive in templates because the
    // returned closure reads `permissions`/`loaded` at call time.
    //
    // Optimistic when not loaded: UI hints are cosmetic — we never block a logged-in user
    // on a missing/failed hint; the PDP (and the graceful 403 handler) is the real gate.
    can: (state) => {
      return (resource: string, action: string): boolean => {
        if (!state.loaded) return true;
        return state.permissions[resource]?.includes(action) ?? false;
      };
    },
  },
  actions: {
    async hydrate() {
      // Use the guest instance: it sends credentials (withCredentials) but does NOT
      // camelCase the response, so the permissions map keys (poam_item,
      // component-definition, dashboard-suggestion, ...) are preserved verbatim. It also
      // works outside component setup (no useRouter/useToast), unlike the authenticated
      // instance — important for boot-time and interceptor-driven hydration.
      const axios = useGuestInstance();
      try {
        const response = await axios.get<PermissionsResponse>(
          '/api/me/permissions',
        );
        this.subject = response.data.subject ?? null;
        this.permissions = response.data.permissions ?? {};
        this.loaded = true;
        return this.permissions;
      } catch {
        // Swallow: leave `loaded` as-is so can() stays optimistic. The PDP remains the
        // source of truth and denied writes still surface via the global 403 handler.
        return undefined;
      }
    },
    reset() {
      this.subject = null;
      this.permissions = {};
      this.loaded = false;
    },
  },
  persist: true,
});
