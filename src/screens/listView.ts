import {
  computed,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type WritableComputedRef,
} from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import type { DataTableSort } from '@/ds/components/DataTable/types';

/**
 * The URL view most list screens share: a title search (`q`) and a sortable column (`sort`, `dir`).
 * Defaults stay out of the URL, and each change is a history entry, so Back undoes it and a shared
 * link reproduces the view. Screens with more filters (Evidence, the risk register) keep their own.
 */
export interface ListView<K extends string> {
  q: ComputedRef<string>;
  sortKey: ComputedRef<K>;
  sortDir: ComputedRef<DataTableSort['direction']>;
  /** The search box's text before it is applied. */
  draft: Ref<string>;
  /** For FilterBar `chips` and DataState `filters`. */
  chips: ComputedRef<{ label: string }[]>;
  chipLabels: ComputedRef<string[]>;
  /** `v-model:sort` for DataTable. */
  sort: WritableComputedRef<DataTableSort>;
  search: () => void;
  clearSearch: () => void;
  /** Sorts rows by the current column (natural order), then by `tieBreak`. */
  sortRows: <R extends Record<K, string>>(rows: R[], tieBreak: K) => R[];
}

export function useListView<K extends string>(
  sortKeys: readonly K[],
  defaultSort: K,
  defaultDir: DataTableSort['direction'] = 'ascending',
): ListView<K> {
  const route = useRoute();
  const router = useRouter();

  const q = computed(() => String(route.query.q ?? ''));
  const sortKey = computed<K>(() =>
    sortKeys.includes(route.query.sort as K)
      ? (route.query.sort as K)
      : defaultSort,
  );
  const sortDir = computed<DataTableSort['direction']>(() =>
    route.query.dir === 'descending' || route.query.dir === 'ascending'
      ? route.query.dir
      : defaultDir,
  );

  function go(patch: { q?: string; sort?: string; dir?: string }): void {
    const query: LocationQueryRaw = { ...route.query, ...patch };
    if (!query.q) delete query.q;
    if (query.sort === defaultSort) delete query.sort;
    if (query.dir === defaultDir) delete query.dir;
    void router.push({ query });
  }

  const draft = ref(q.value);
  watch(q, (value) => (draft.value = value));

  const chips = computed(() =>
    q.value ? [{ label: `Search: ${q.value}` }] : [],
  );

  return {
    q,
    sortKey,
    sortDir,
    draft,
    chips,
    chipLabels: computed(() => chips.value.map((chip) => chip.label)),
    sort: computed<DataTableSort>({
      get: () => ({ key: sortKey.value, direction: sortDir.value }),
      set: (next) => go({ sort: next.key, dir: next.direction }),
    }),
    search: () => go({ q: draft.value.trim() }),
    clearSearch: () => go({ q: '' }),
    sortRows: (rows, tieBreak) => {
      const key = sortKey.value;
      const sign = sortDir.value === 'ascending' ? 1 : -1;
      return [...rows].sort(
        (a, b) =>
          sign * a[key].localeCompare(b[key], 'en', { numeric: true }) ||
          a[tieBreak].localeCompare(b[tieBreak]),
      );
    },
  };
}

/** True when `text` contains the search, ignoring case; an empty search matches everything. */
export function matches(
  search: string,
  ...texts: (string | undefined)[]
): boolean {
  const needle = search.trim().toLowerCase();
  return !needle || texts.some((text) => text?.toLowerCase().includes(needle));
}
