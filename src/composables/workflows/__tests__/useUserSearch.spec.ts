import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserSearch } from '../useUserSearch';
import type { CCFUser } from '@/stores/types';

// Mock useDataApi
vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn((url: string | null) => ({
    execute: vi.fn(),
    data: { value: null },
  })),
}));

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
