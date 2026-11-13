import type { LocationQuery, LocationQueryRaw } from 'vue-router';

/**
 * The Systems list's view state, read from and written to the URL query, so Back, Forward and
 * Share reproduce the exact view. Defaults stay out of the URL.
 */
export type SortKey = 'name' | 'version' | 'lastModified';
export type SortDirection = 'ascending' | 'descending';

export interface SystemsView {
  q: string;
  sort: SortKey;
  dir: SortDirection;
}

const sortKeys: SortKey[] = ['name', 'version', 'lastModified'];
const DEFAULT_SORT: SortKey = 'name';
const DEFAULT_DIRECTION: SortDirection = 'ascending';

function single(value: LocationQuery[string] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readView(query: LocationQuery): SystemsView {
  const dir = single(query.dir);
  return {
    q: single(query.q).trim(),
    sort: sortKeys.find((key) => key === single(query.sort)) ?? DEFAULT_SORT,
    dir: dir === 'ascending' || dir === 'descending' ? dir : DEFAULT_DIRECTION,
  };
}

/** The URL query for a view, without its defaults. */
export function viewQuery(view: SystemsView): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  if (view.q) query.q = view.q;
  if (view.sort !== DEFAULT_SORT || view.dir !== DEFAULT_DIRECTION) {
    query.sort = view.sort;
    query.dir = view.dir;
  }
  return query;
}

export interface SortableRow {
  name: string;
  version: string;
  lastModified: string;
}

/** Sorts by the chosen column; ties fall back to the name. */
export function sortRows<T extends SortableRow>(
  rows: T[],
  sort: SortKey,
  dir: SortDirection,
): T[] {
  const byName = (a: T, b: T) =>
    a.name.localeCompare(b.name, 'en', { numeric: true });
  const compare: Record<SortKey, (a: T, b: T) => number> = {
    name: byName,
    version: (a, b) =>
      a.version.localeCompare(b.version, 'en', { numeric: true }),
    lastModified: (a, b) => a.lastModified.localeCompare(b.lastModified),
  };
  const sign = dir === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare[sort](a, b) || byName(a, b));
}

/** "name, A to Z", for the table's caption. */
export function sortLabel(sort: SortKey, dir: SortDirection): string {
  const labels: Record<SortKey, [string, string]> = {
    name: ['name, A to Z', 'name, Z to A'],
    version: ['version, lowest first', 'version, highest first'],
    lastModified: [
      'last modified, oldest first',
      'last modified, newest first',
    ],
  };
  return labels[sort][dir === 'ascending' ? 0 : 1];
}
