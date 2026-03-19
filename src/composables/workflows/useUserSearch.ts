import { ref } from 'vue';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';

export interface DisplayUser extends CCFUser {
  displayName: string;
}

interface SelectableUserResponse {
  id: string;
  displayName: string;
}

const USER_LOOKUP_BATCH_SIZE = 5;

/**
 * Composable for managing user search, caching, and display in workflow role assignments.
 * Reduces complexity in components that need to search and display users.
 */
export function useUserSearch() {
  const userSuggestions = ref<DisplayUser[]>([]);
  const userCache = ref<Record<string, DisplayUser>>({});
  const authenticatedApi = useAuthenticatedInstance();

  const { execute: fetchSelectableUsers, data: selectableUsersData } =
    useDataApi<SelectableUserResponse[]>('/api/users/select', null, {
      immediate: false,
    });

  /**
   * Convert a CCFUser to DisplayUser with formatted display name
   */
  function toDisplayUser(user: CCFUser): DisplayUser {
    const firstName =
      typeof user.firstName === 'string' ? user.firstName.trim() : '';
    const lastName =
      typeof user.lastName === 'string' ? user.lastName.trim() : '';
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    const id = typeof user.id === 'string' ? user.id.trim() : '';
    const displayName = `${firstName} ${lastName}`.trim() || email || id;
    return {
      ...user,
      id,
      email,
      firstName,
      lastName,
      displayName,
    };
  }

  /**
   * Cache a user in the local cache for quick lookup
   */
  function cacheUser(user: DisplayUser | undefined) {
    if (!user?.id) return;
    userCache.value = {
      ...userCache.value,
      [user.id]: user,
    };
  }

  /**
   * Convert a selectable user response to a DisplayUser.
   */
  function toSelectableDisplayUser(user: SelectableUserResponse): DisplayUser {
    const id = typeof user.id === 'string' ? user.id.trim() : '';
    const displayName =
      typeof user.displayName === 'string' ? user.displayName.trim() : '';
    return {
      id,
      email: '',
      firstName: '',
      lastName: '',
      failedLogins: 0,
      displayName: displayName || id,
    };
  }

  /**
   * Search for users based on query string
   * Filters by display name and ID, and clears suggestions on error
   */
  async function searchUsers(event: { query: string }) {
    const trimmedQuery = event.query.trim();
    const normalized = trimmedQuery.toLowerCase();
    if (normalized.length < 3) {
      userSuggestions.value = [];
      return;
    }

    try {
      await fetchSelectableUsers(
        `/api/users/select?search=${encodeURIComponent(trimmedQuery)}`,
      );
      const payload = selectableUsersData.value ?? [];

      const filtered = normalized
        ? payload.filter((user) => {
            const displayName = (user.displayName || '').toLowerCase();
            const id = (user.id || '').toLowerCase();
            return displayName.includes(normalized) || id.includes(normalized);
          })
        : payload;

      const displayUsers = filtered.map(toSelectableDisplayUser);
      userSuggestions.value = displayUsers;
      displayUsers.forEach(cacheUser);
    } catch {
      userSuggestions.value = [];
    }
  }

  /**
   * Load users by their IDs and cache them
   * Useful for loading users associated with existing assignments
   */
  async function loadUsersByIds(ids: string[]) {
    const normalizedIds = ids
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => !!id);
    const missing = Array.from(
      new Set(normalizedIds.filter((id) => !userCache.value[id])),
    );

    if (!missing.length) {
      return;
    }

    for (
      let index = 0;
      index < missing.length;
      index += USER_LOOKUP_BATCH_SIZE
    ) {
      const batch = missing.slice(index, index + USER_LOOKUP_BATCH_SIZE);
      const batchRequests = batch.map(async (id) => {
        const response = await authenticatedApi.get<{
          data?: SelectableUserResponse[];
        }>(`/api/users/select?search=${encodeURIComponent(id)}`);
        const selectableUsers = response.data?.data ?? [];
        const matchingUser = selectableUsers.find((user) => user.id === id);
        if (matchingUser) {
          cacheUser(toSelectableDisplayUser(matchingUser));
        }
      });

      await Promise.allSettled(batchRequests);
    }
  }

  /**
   * Get a cached user by ID
   */
  function getCachedUser(id: string | undefined): DisplayUser | undefined {
    if (!id) return undefined;
    return userCache.value[id];
  }

  /**
   * Clear all cached users
   */
  function clearCache() {
    userCache.value = {};
  }

  return {
    userSuggestions,
    userCache,
    searchUsers,
    loadUsersByIds,
    getCachedUser,
    cacheUser,
    toDisplayUser,
    toSelectableDisplayUser,
    clearCache,
  };
}
