import { beforeEach, describe, expect, it } from 'vitest';
import { createFixtureApi, resetFixtureState } from '../fixtureApi';
import { instanceIds } from '../fixtures';

describe('fixture API (U0.6)', () => {
  beforeEach(() => resetFixtureState());

  it('increments on save, returns created:false for an identical overlay', async () => {
    const api = createFixtureApi();
    const cur = await api.getConfig('x');
    expect(cur.revision).toBe(7);
    const saved = await api.putConfig('x', { overlay: { verbosity: 2 } }, 7);
    expect(saved).toMatchObject({ created: true, revision: { revision: 8 } });
    const same = await api.putConfig('x', { overlay: { verbosity: 2 } }, 8);
    expect(same.created).toBe(false);
  });

  it('throws conflict on a stale If-Match and invalid on locked keys or masked values', async () => {
    const api = createFixtureApi();
    await expect(api.putConfig('x', { overlay: {} }, 3)).rejects.toMatchObject({
      kind: 'conflict',
      currentRevision: 7,
    });
    await expect(
      api.putConfig('x', { overlay: { api: {} } }, 7),
    ).rejects.toMatchObject({ kind: 'invalid' });
    await expect(
      api.putConfig(
        'x',
        { overlay: { plugins: { a: { config: { k: '••••' } } } } },
        7,
      ),
    ).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('serves instances, details, revisions and a preview', async () => {
    const api = createFixtureApi();
    const list = await api.listInstances('x');
    expect(list.items.length).toBe(7);
    const detail = await api.getInstance('x', instanceIds.b);
    expect(detail.base?.plugins?.['local-ssh']).toBeTruthy();
    const page = await api.listRevisions('x', 1, 5);
    expect(page).toMatchObject({ total: 7, totalPages: 2 });
    expect(page.items[0]).not.toHaveProperty('overlay');
    const preview = await api.preview('x', { verbosity: 2 });
    expect(preview.standalone).toBe(false);
    const reverted = await api.revert('x', 6, 7);
    expect(reverted.revision.revertOf).toBe(6);
  });
});
