import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePermissionsStore } from '@/stores/permissions';

describe('permissions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('is optimistic before permissions load (UI hints are cosmetic; the PDP is the gate)', () => {
    const store = usePermissionsStore();
    expect(store.loaded).toBe(false);
    // Nothing loaded yet -> never block a logged-in user.
    expect(store.can('risk', 'create')).toBe(true);
    expect(store.can('admin', 'manage')).toBe(true);
  });

  it('reflects the permission map once loaded', () => {
    const store = usePermissionsStore();
    store.permissions = { risk: ['read', 'create'], admin: [] };
    store.loaded = true;

    expect(store.can('risk', 'create')).toBe(true);
    expect(store.can('risk', 'delete')).toBe(false);
    // Present-but-empty resource -> denied.
    expect(store.can('admin', 'manage')).toBe(false);
    // Resource absent from the map -> denied (every manifest resource is normally present).
    expect(store.can('something-else', 'read')).toBe(false);
  });

  it('reset() clears state and returns to optimistic mode', () => {
    const store = usePermissionsStore();
    store.subject = { type: 'user', id: 'alice@acme.com' };
    store.permissions = { risk: ['read'] };
    store.loaded = true;

    store.reset();

    expect(store.subject).toBeNull();
    expect(store.permissions).toEqual({});
    expect(store.loaded).toBe(false);
    expect(store.can('risk', 'delete')).toBe(true);
  });
});
