// The agent instance list is paginated (api#476/#483: ?page&limit, limit max 25, last seen
// first; meta.counts cover every instance). Views that need EVERY instance (field access over
// the fleet, the instance files the draft is computed against) load it through
// listAllInstances, which stops at a hard page cap and says when the result is partial.

import type { AgentConfigApi, InstancesList } from './api-types';

/** The API's page size for instances, and its maximum. */
export const INSTANCE_PAGE_LIMIT = 25;

/**
 * At most this many pages (100 instances) are loaded for one agent. A worst-case instance
 * summary is about 3 MiB (warnings, unsafe changes, plugins, remote_config), so this bounds a
 * load to about 300 MiB in the worst case and a few hundred KiB in practice, while agents are
 * expected to run one instance each. Past it the list is partial.
 */
export const MAX_INSTANCE_PAGES = 4;

export interface AllInstances extends InstancesList {
  /** Not every instance is loaded (more pages than the cap, or the list moved while paging). */
  partial: boolean;
}

/**
 * Every instance of `agentId`, page by page in order until the last page or `maxPages`. Pages
 * can shift while they are read (the order is last seen first), so an instance is kept once.
 * `meta` is the last page's (its counts are the freshest).
 */
export async function listAllInstances(
  api: AgentConfigApi,
  agentId: string,
  maxPages = MAX_INSTANCE_PAGES,
): Promise<AllInstances> {
  let res = await api.listInstances(agentId, {
    page: 1,
    limit: INSTANCE_PAGE_LIMIT,
  });
  const byId = new Map(res.items.map((i) => [i.instanceId, i]));
  // A row seen twice means the list moved under the pages: some other row was skipped.
  let shifted = false;
  let page = 1;
  while (page < (res.meta.totalPages ?? 1) && page < maxPages) {
    page++;
    res = await api.listInstances(agentId, {
      page,
      limit: INSTANCE_PAGE_LIMIT,
    });
    for (const i of res.items) {
      if (byId.has(i.instanceId)) shifted = true;
      else byId.set(i.instanceId, i);
    }
  }
  return {
    items: Array.from(byId.values()),
    meta: res.meta,
    partial: shifted || page < (res.meta.totalPages ?? 1),
  };
}
