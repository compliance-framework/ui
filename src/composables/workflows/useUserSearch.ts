import { ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';

export interface DisplayUser extends CCFUser {
  displayName: string;
}

/**
 * Composable for managing user search, caching, and display in workflow role assignments.
 * Reduces complexity in components that need to search and display users.
 */
export function useUserSearch() {
  const userSuggestions = ref<DisplayUser[]>([]);
  const userCache = ref<Record<string, DisplayUser>>({});

  const { execute: fetchUsers, data: usersData } = useDataApi<CCFUser[]>(
    '/api/admin/users',
    null,
    { immediate: false },
  );

  const { execute: fetchUserById, data: fetchedUser } = useDataApi<CCFUser>(
    null,
    null,
    { immediate: false },
  );

  /**
   * Convert a CCFUser to DisplayUser with formatted display name
   */
  function toDisplayUser(user: CCFUser): DisplayUser {
    const displayName =
      `${user.firstName} ${user.lastName}`.trim() || user.email || user.id;
    return {
      ...user,
      displayName,
    };
  }

  /**
   * Cache a user in the local cache for quick lookup
   */
  function cacheUser(user: DisplayUser | undefined) {
    if (!user) return;
    userCache.value = {
      ...userCache.value,
      [user.id]: user,
    };
  }

  /**
   * Search for users based on query string
   * Filters by name and email, with fallback mock user on error
   */
  async function searchUsers(event: { query: string }) {
    try {
      await fetchUsers(`/api/admin/users?search=${event.query}`);
      const payload = usersData.value ?? [];
      const normalized = event.query.trim().toLowerCase();

      const filtered = normalized
        ? payload.filter((user) => {
            const name = `${user.firstName} ${user.lastName}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(normalized) || email.includes(normalized);
          })
        : payload;

      const displayUsers = filtered.map(toDisplayUser);
      userSuggestions.value = displayUsers;
      displayUsers.forEach(cacheUser);
    } catch {
      // Fallback: create a mock user from the query
      userSuggestions.value = [
        {
          id: event.query,
          email: `${event.query.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          firstName: event.query,
          lastName: '',
          failedLogins: 0,
          displayName: event.query,
        } as DisplayUser,
      ];
    }
  }

  /**
   * Load users by their IDs and cache them
   * Useful for loading users associated with existing assignments
   */
  async function loadUsersByIds(ids: string[]) {
    const missing = ids.filter((id) => !userCache.value[id]);

    await Promise.all(
      missing.map(async (id) => {
        try {
          await fetchUserById(`/api/admin/users/${id}`);
          const payload = fetchedUser.value;
          if (payload) {
            cacheUser(toDisplayUser(payload));
          }
        } catch {
          // Silently fail - user will show as ID only
        }
      }),
    );
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
    clearCache,
  };
}
