import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSystemStore, type PartialSystemSecurityPlan } from '../system';

function plan(uuid: string, title = uuid): PartialSystemSecurityPlan {
  return { uuid, metadata: { title } } as PartialSystemSecurityPlan;
}

describe('system store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('auto-selects the only available system when none is active', () => {
    const store = useSystemStore();
    store.setAvailablePlans([plan('ssp-1')]);

    expect(store.system.securityPlan?.uuid).toBe('ssp-1');
    expect(store.availablePlansLoaded).toBe(true);
  });

  it('leaves the choice to the user when several systems exist', () => {
    const store = useSystemStore();
    store.setAvailablePlans([plan('ssp-1'), plan('ssp-2')]);

    expect(store.system.securityPlan).toBeUndefined();
  });

  it('drops an active system that no longer exists', () => {
    const store = useSystemStore();
    store.setSecurityPlan(plan('deleted'));
    store.setAvailablePlans([plan('ssp-1'), plan('ssp-2')]);

    expect(store.system.securityPlan).toBeUndefined();
  });

  it('refreshes the active system title from the latest list', () => {
    const store = useSystemStore();
    store.setSecurityPlan(plan('ssp-1', 'Old name'));
    store.setAvailablePlans([plan('ssp-1', 'New name'), plan('ssp-2')]);

    expect(store.system.securityPlan?.metadata.title).toBe('New name');
  });
});
