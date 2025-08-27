import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { Catalog, Control } from '@/oscal';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { AxiosError } from 'axios';

export interface ControlOption {
  label: string;
  value: string;
}

export interface SelectControl {
  label: string;
  code: string;
  items: ControlOption[];
}

export interface ControlListResponse {
  controls: Ref<SelectControl[]>;
  error: Ref<string | ErrorResponse<unknown> | null>;
}

const createControlList = (
  catalogUUIDs: MaybeRefOrGetter<string[]>,
): ControlListResponse => {
  const { execute: fetchFullCatalog } = useDataApi<Catalog>(null, null, {
    abortPrevious: false,
  });
  const controls = ref<SelectControl[]>([]);
  const catalogIDs = toValue(catalogUUIDs);
  const errorRef = ref<string | ErrorResponse<unknown> | null>(null);

  watch(catalogUUIDs, buildControlList, { immediate: true });

  async function buildControlList() {
    catalogIDs.forEach(async (catalogUUID) => {
      try {
        const response = await fetchFullCatalog(
          `/api/oscal/catalogs/${catalogUUID}/full`,
        );
        const results = [] as SelectControl[];
        response.data.value?.data.groups.forEach((group) => {
          let controlList = [] as ControlOption[];
          if (group.controls) {
            group.controls.forEach((control) => {
              controlList = [...controlList, ...getControlSelectList(control)];
            });

            results.push({
              label: group.title,
              code: group.id,
              items: controlList,
            });
          }
        });
        controls.value = [...controls.value, ...results];
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        console.error('Error fetching full catalog:', errorResponse);
        errorRef.value =
          errorResponse.response?.data || 'An unknown error occurred';
      }
    });
  }

  function getControlSelectList(control: Control): ControlOption[] {
    let results = [] as ControlOption[];

    if (control.controls) {
      control.controls.forEach((cont) => {
        let subResults = [] as ControlOption[];
        if (cont.controls && cont.controls.length > 0) {
          subResults = getControlSelectList(cont);
        }
        results.push({
          label: cont.id + ' ' + cont.title,
          value: cont.id,
        });
        results = [...results, ...subResults];
      });
    } else {
      results.push({
        label: control.id + ' ' + control.title,
        value: control.id,
      });
    }

    return results;
  }

  return { controls, error: errorRef };
};

/**
 * Search items (and their parent groups) and return a flat list of options.
 * - Case/accent-insensitive.
 * - Matches on item.label, item.value, group.label, group.code.
 * - Tokens: all words in the query must be present somewhere in the combined text.
 * - Results are ranked so exact/startsWith/value matches appear first.
 */
function rankedSearch(
  query: string,
  controlList: SelectControl[],
): ControlOption[] {
  const q = normalize(query.trim());
  const tokens = q ? q.split(/\s+/) : [];

  const results: { opt: ControlOption; score: number }[] = [];
  const seen = new Set<string>(); // dedupe by value

  for (const group of controlList) {
    const gLabel = normalize(group.label);
    const gCode = normalize(group.code);

    for (const item of group.items) {
      const iLabel = normalize(item.label);
      const iValue = normalize(item.value);

      // Combine searchable text for token checks
      const haystack = `${iLabel} ${iValue} ${gLabel} ${gCode}`.trim();

      // If there's a query, require all tokens to appear somewhere
      if (tokens.length && !tokens.every((t) => haystack.includes(t))) continue;

      let score = 0;

      // Ranking heuristics (bigger is better)
      if (q.length) {
        // Strong boosts for value matches (useful for "BD-2.3" queries)
        if (iValue === q) score += 1000;
        if (iValue.startsWith(q)) score += 400;
        if (iValue.includes(q)) score += 250;

        // Label relevance
        if (iLabel.startsWith(q)) score += 150;
        if (iLabel.includes(q)) score += 120;

        // Group context relevance
        if (gCode.startsWith(q)) score += 80;
        if (gCode.includes(q)) score += 60;
        if (gLabel.includes(q)) score += 40;

        // Slight reward per satisfied token
        score += tokens.length * 5;
      }

      // Dedupe by value while keeping best score
      if (!seen.has(item.value)) {
        results.push({ opt: { label: item.label, value: item.value }, score });
        seen.add(item.value);
      }
    }
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.opt.label.localeCompare(b.opt.label, undefined, { numeric: true }),
  );

  return results.map((r) => r.opt);
}

/** Lowercase, strip accents, collapse spaces, keep letters/numbers/.- */
function normalize(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      // strip combining diacritical marks
      .replace(/[\u0300-\u036f]/g, '')
      // replace non word-ish chars (but keep dot/hyphen) with spaces
      .replace(/[^a-z0-9.\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export { createControlList, rankedSearch };
