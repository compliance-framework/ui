import { serializeFilter } from '@/parsers/labelfilter';
import type { Dashboard } from '@/stores/filters';

/** A filter's evidence: its system's Evidence page, or the global one. */
export function evidenceLink(filter: Dashboard) {
  const query = { filter: serializeFilter(filter.filter) };
  return filter.sspId
    ? { name: 'system-evidence', params: { systemId: filter.sspId }, query }
    : { name: 'evidence:index', query };
}
