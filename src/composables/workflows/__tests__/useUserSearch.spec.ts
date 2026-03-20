import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserSearch } from '../useUserSearch';
import type { CCFUser } from '@/stores/types';

const mockAuthenticatedGet = vi.hoisted(() => vi.fn());
const mockSelectableUsers = vi.hoisted(() => [
  { id: 'user-1', displayName: 'Alpha User' },
  { id: 'user-2', displayName: 'Beta User' },
  { id: 'already-cached', displayName: 'Cached User' },
]);
const mockUseDataApi = vi.hoisted(() =>
  vi.fn(() => {
    const data = { value: mockSelectableUsers.slice() };
    const execute = vi.fn(async (url?: string) => {
      if (!url) {
        return;
      }

      const search = new URL(url, 'http://localhost').searchParams
        .get('search')
        ?.trim()
        .toLowerCase();

      data.value = search
        ? mockSelectableUsers.filter(
            (user) =>
              user.displayName.toLowerCase().includes(search) ||
              user.id.toLowerCase().includes(search),
          )
        : mockSelectableUsers.slice();
    });

    return {
      execute,
      data,
    };
  }),
);

// Mock useDataApi
vi.mock('@/composables/axios', () => ({
  useDataApi: mockUseDataApi,
  useAuthenticatedInstance: vi.fn(() => ({
    get: mockAuthenticatedGet,
  })),
}));

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedGet.mockReset();
  });

  it('searches selectable users by name or ID', async () => {
    const { searchUsers, userSuggestions } = useUserSearch();

    await searchUsers({ query: 'alpha' });

    expect(userSuggestions.value).toHaveLength(1);
    expect(userSuggestions.value[0].id).toBe('user-1');
    expect(userSuggestions.value[0].displayName).toBe('Alpha User');
  });

  it('uses the trimmed query when calling the selectable-users API', async () => {
    const { searchUsers } = useUserSearch();
    const execute = mockUseDataApi.mock.results.at(-1)?.value.execute as
      | ReturnType<typeof vi.fn>
      | undefined;

    await searchUsers({ query: '  alpha  ' });

    expect(execute).toHaveBeenCalledWith('/api/users/select?search=alpha');
  });

  it('does not call the selectable-users API for queries shorter than 3 characters', async () => {
    const { searchUsers, userSuggestions } = useUserSearch();
    const execute = mockUseDataApi.mock.results.at(-1)?.value.execute as
      | ReturnType<typeof vi.fn>
      | undefined;

    await searchUsers({ query: 'ab' });

    expect(execute).toBeDefined();
    expect(execute).not.toHaveBeenCalled();
    expect(userSuggestions.value).toHaveLength(0);
  });

  describe('toDisplayUser', () => {
    it('creates display name from first and last name', () => {
      const { toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        failedLogins: 0,
      };

      const displayUser = toDisplayUser(user);

      expect(displayUser.displayName).toBe('John Doe');
      expect(displayUser.id).toBe('123');
      expect(displayUser.email).toBe('test@example.com');
    });

    it('falls back to email when name is empty', () => {
      const { toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: '',
        lastName: '',
        failedLogins: 0,
      };

      const displayUser = toDisplayUser(user);

      expect(displayUser.displayName).toBe('test@example.com');
    });

    it('falls back to id when name and email are empty', () => {
      const { toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: '',
        firstName: '',
        lastName: '',
        failedLogins: 0,
      };

      const displayUser = toDisplayUser(user);

      expect(displayUser.displayName).toBe('123');
    });

    it('trims whitespace from name', () => {
      const { toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: '  John  ',
        lastName: '  Doe  ',
        failedLogins: 0,
      };

      const displayUser = toDisplayUser(user);

      expect(displayUser.displayName).toBe('John Doe');
    });

    it('handles null-like name fields by falling back safely', () => {
      const { toDisplayUser } = useUserSearch();
      const user = {
        id: '123',
        email: 'test@example.com',
        firstName: null,
        lastName: undefined,
        failedLogins: 0,
      } as unknown as CCFUser;

      const displayUser = toDisplayUser(user);

      expect(displayUser.displayName).toBe('test@example.com');
      expect(displayUser.firstName).toBe('');
      expect(displayUser.lastName).toBe('');
    });
  });

  describe('cacheUser', () => {
    it('adds user to cache', () => {
      const { cacheUser, userCache, toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        failedLogins: 0,
      };
      const displayUser = toDisplayUser(user);

      cacheUser(displayUser);

      expect(userCache.value['123']).toEqual(displayUser);
    });

    it('handles undefined user gracefully', () => {
      const { cacheUser, userCache } = useUserSearch();

      cacheUser(undefined);

      expect(Object.keys(userCache.value)).toHaveLength(0);
    });

    it('overwrites existing cached user', () => {
      const { cacheUser, userCache, toDisplayUser } = useUserSearch();
      const user1: CCFUser = {
        id: '123',
        email: 'old@example.com',
        firstName: 'Old',
        lastName: 'Name',
        failedLogins: 0,
      };
      const user2: CCFUser = {
        id: '123',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Name',
        failedLogins: 0,
      };

      cacheUser(toDisplayUser(user1));
      cacheUser(toDisplayUser(user2));

      expect(userCache.value['123'].email).toBe('new@example.com');
      expect(userCache.value['123'].displayName).toBe('New Name');
    });
  });

  describe('getCachedUser', () => {
    it('returns cached user by id', () => {
      const { cacheUser, getCachedUser, toDisplayUser } = useUserSearch();
      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        failedLogins: 0,
      };
      const displayUser = toDisplayUser(user);
      cacheUser(displayUser);

      const result = getCachedUser('123');

      expect(result).toEqual(displayUser);
    });

    it('returns undefined for non-existent user', () => {
      const { getCachedUser } = useUserSearch();

      const result = getCachedUser('non-existent');

      expect(result).toBeUndefined();
    });

    it('returns undefined for undefined id', () => {
      const { getCachedUser } = useUserSearch();

      const result = getCachedUser(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('clears all cached users', () => {
      const { cacheUser, clearCache, userCache, toDisplayUser } =
        useUserSearch();
      const user1: CCFUser = {
        id: '123',
        email: 'test1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        failedLogins: 0,
      };
      const user2: CCFUser = {
        id: '456',
        email: 'test2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        failedLogins: 0,
      };

      cacheUser(toDisplayUser(user1));
      cacheUser(toDisplayUser(user2));
      expect(Object.keys(userCache.value)).toHaveLength(2);

      clearCache();

      expect(Object.keys(userCache.value)).toHaveLength(0);
    });
  });

  describe('integration', () => {
    it('maintains separate caches for multiple instances', () => {
      const instance1 = useUserSearch();
      const instance2 = useUserSearch();

      const user: CCFUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        failedLogins: 0,
      };

      instance1.cacheUser(instance1.toDisplayUser(user));

      expect(instance1.getCachedUser('123')).toBeDefined();
      expect(instance2.getCachedUser('123')).toBeUndefined();
    });

    it('hydrates missing users by id and skips already cached users', async () => {
      mockAuthenticatedGet.mockImplementation(async (url: string) => {
        const pathname = new URL(url, 'http://localhost').pathname;
        const id = pathname.split('/').pop() ?? '';
        const match = mockSelectableUsers.find((user) => user.id === id);

        return {
          data: {
            data: match
              ? {
                  id: match.id,
                  name: match.displayName,
                }
              : undefined,
          },
        };
      });

      const { cacheUser, toDisplayUser, loadUsersByIds, getCachedUser } =
        useUserSearch();
      cacheUser(
        toDisplayUser({
          id: 'already-cached',
          email: 'cached@example.com',
          firstName: 'Cached',
          lastName: 'User',
          failedLogins: 0,
        }),
      );

      await loadUsersByIds([
        'already-cached',
        'user-1',
        'user-2',
        'user-3',
        'user-4',
        'user-5',
        'user-6',
      ]);

      expect(mockAuthenticatedGet).toHaveBeenCalledTimes(6);
      expect(getCachedUser('already-cached')?.email).toBe('cached@example.com');
      expect(getCachedUser('user-1')?.displayName).toBe('Alpha User');
      expect(getCachedUser('user-2')?.displayName).toBe('Beta User');
    });
  });
});
