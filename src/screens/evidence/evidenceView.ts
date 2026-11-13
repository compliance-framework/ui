import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import { FilterParser, type Filter } from '@/parsers/labelfilter';
import type { EvidenceSortBy, SortDirection } from '@/stores/evidence';

/**
 * The evidence list's view state, read from and written to the URL query. It uses the classic
 * evidence page's parameter names (filter, page, sortBy, sortDirection, subject), so a view opens
 * unchanged on either page. Defaults stay out of the URL.
 */
export interface EvidenceView {
  filter: string;
  page: number;
  sortBy: EvidenceSortBy;
  sortDirection: SortDirection;
  /** A subject UUID set by the classic page's subject filter; carried through, not edited here. */
  subject: string;
}

export const EVIDENCE_PAGE_SIZE = 50;

const DEFAULT_SORT_BY: EvidenceSortBy = 'lastSeenAt';
const DEFAULT_DIRECTION: SortDirection = 'desc';

function single(value: LocationQuery[string] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readView(query: LocationQuery): EvidenceView {
  const sortBy = single(query.sortBy);
  const direction = single(query.sortDirection);
  const page = Number.parseInt(single(query.page), 10);
  return {
    filter: single(query.filter).trim(),
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    sortBy:
      sortBy === 'name' || sortBy === 'status' || sortBy === 'lastSeenAt'
        ? sortBy
        : DEFAULT_SORT_BY,
    sortDirection:
      direction === 'asc' || direction === 'desc'
        ? direction
        : DEFAULT_DIRECTION,
    subject: single(query.subject),
  };
}

/** The URL query for a view, without its defaults. */
export function viewQuery(view: EvidenceView): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  if (view.filter) query.filter = view.filter;
  if (view.page > 1) query.page = String(view.page);
  if (view.sortBy !== DEFAULT_SORT_BY) query.sortBy = view.sortBy;
  if (view.sortDirection !== DEFAULT_DIRECTION)
    query.sortDirection = view.sortDirection;
  if (view.subject) query.subject = view.subject;
  return query;
}

/** A search containing `=` or `!=` is a label query; anything else searches titles. */
export function isLabelQuery(text: string): boolean {
  return /!?=/.test(text);
}

/**
 * Why a search can't run, or undefined when it can. Mirrors the classic page: an empty search
 * lists everything, a title search needs three characters, and a label query must parse.
 */
export function searchError(text: string): string | undefined {
  const search = text.trim();
  if (!search) return undefined;
  if (!isLabelQuery(search)) {
    return search.length < 3
      ? 'Title searches need at least 3 characters.'
      : undefined;
  }
  if (/!?=\s*$/.test(search)) return 'Finish the condition with a value.';
  try {
    new FilterParser(search).parse();
    return undefined;
  } catch (error) {
    return error instanceof Error
      ? `Check the query: ${error.message}`
      : 'Check the query.';
  }
}

/** The search API request for a view: query parameters and the label filter body. */
export function searchRequest(view: EvidenceView): {
  params: Record<string, string>;
  body: { filter: Filter };
} {
  const label = isLabelQuery(view.filter);
  const params: Record<string, string> = {
    page: String(view.page),
    limit: String(EVIDENCE_PAGE_SIZE),
    sortBy: view.sortBy,
    sortDirection: view.sortDirection,
  };
  if (view.filter && !label) params.name = view.filter;
  if (view.subject) params.subjectUuid = view.subject;
  return {
    params,
    body: { filter: new FilterParser(label ? view.filter : '').parse() },
  };
}
