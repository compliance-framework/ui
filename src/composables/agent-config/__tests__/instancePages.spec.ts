import { describe, expect, it, vi } from 'vitest';
import type { AgentConfigApi, InstancesPageQuery } from '../api-types';
import type { AgentInstanceSummary } from '@/types/agent-config';
import {
  INSTANCE_PAGE_LIMIT,
  MAX_INSTANCE_PAGES,
  listAllInstances,
} from '../instancePages';
import { instancesMixed } from './fixtures';

/** A fleet of `n` instances served `limit` per page, as the API does. */
function fleet(n: number) {
  const rows: AgentInstanceSummary[] = Array.from({ length: n }, (_, i) => ({
    ...instancesMixed.items[0],
    instanceId: `i${i + 1}`,
    hostname: `ip-${i + 1}`,
  }));
  const listInstances = vi.fn(
    async (_agentId: string, q: InstancesPageQuery = {}) => {
      const page = q.page ?? 1;
      const limit = q.limit ?? INSTANCE_PAGE_LIMIT;
      return {
        items: rows.slice((page - 1) * limit, page * limit),
        meta: {
          desiredRevision: 7,
          counts: { ...instancesMixed.meta.counts, total: n },
          page,
          limit,
          total: n,
          totalPages: Math.max(1, Math.ceil(n / limit)),
        },
      };
    },
  );
  return { api: { listInstances } as unknown as AgentConfigApi, listInstances };
}

describe('listAllInstances', () => {
  it('one page: exactly one request', async () => {
    const { api, listInstances } = fleet(1);
    const all = await listAllInstances(api, 'a1');
    expect(listInstances).toHaveBeenCalledTimes(1);
    expect(listInstances).toHaveBeenCalledWith('a1', { page: 1, limit: 25 });
    expect(all.items.map((i) => i.instanceId)).toEqual(['i1']);
    expect(all.partial).toBe(false);
  });

  it('reads the pages in order until the last one', async () => {
    const { api, listInstances } = fleet(60);
    const all = await listAllInstances(api, 'a1');
    expect(listInstances.mock.calls.map((c) => c[1])).toEqual([
      { page: 1, limit: 25 },
      { page: 2, limit: 25 },
      { page: 3, limit: 25 },
    ]);
    expect(all.items).toHaveLength(60);
    expect(all.meta.totalPages).toBe(3);
    expect(all.partial).toBe(false);
  });

  it(`stops at the cap (${MAX_INSTANCE_PAGES} pages) and says the result is partial`, async () => {
    const { api, listInstances } = fleet(130);
    const all = await listAllInstances(api, 'a1');
    expect(listInstances).toHaveBeenCalledTimes(MAX_INSTANCE_PAGES);
    expect(all.items).toHaveLength(MAX_INSTANCE_PAGES * INSTANCE_PAGE_LIMIT);
    expect(all.meta.counts.total).toBe(130);
    expect(all.partial).toBe(true);
  });

  it('keeps an instance once when pages shift, and then counts the list as partial', async () => {
    const { api, listInstances } = fleet(30);
    const page1 = await listInstances('a1', { page: 1 });
    listInstances.mockClear();
    // Page 2 repeats the last row of page 1 (an instance reported meanwhile): i26 is missed.
    listInstances.mockResolvedValueOnce(page1).mockResolvedValueOnce({
      ...page1,
      items: [page1.items[24]],
      meta: { ...page1.meta, page: 2 },
    });
    const all = await listAllInstances(api, 'a1');
    expect(all.items).toHaveLength(25);
    expect(all.partial).toBe(true);
  });

  it('an unpaginated API (no totalPages) is one page', async () => {
    const listInstances = vi.fn().mockResolvedValue({
      items: instancesMixed.items,
      meta: { desiredRevision: 7, counts: instancesMixed.meta.counts },
    });
    const all = await listAllInstances(
      { listInstances } as unknown as AgentConfigApi,
      'a1',
    );
    expect(listInstances).toHaveBeenCalledTimes(1);
    expect(all.items).toHaveLength(7);
    expect(all.partial).toBe(false);
  });
});
