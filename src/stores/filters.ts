import { type Filter } from '@/parsers/labelfilter.ts';
import type { Control, SystemComponent } from '@/oscal';

// "manual" for user-made filters, "scope-policy" for the automatic per-policy filters an
// SSP creates from its scope.
export type FilterOrigin = 'manual' | 'scope-policy';

export interface Dashboard {
  id?: string;
  uuid?: string;
  name: string;
  sspId?: string | null;
  // The effective expression every evaluation uses. For a filter that follows its SSP's
  // scope it is `scopeBase AND <scope>`, rewritten by the API whenever the scope changes.
  filter: Filter;
  // Set when the filter follows its SSP's scope: the user's own expression.
  scopeBase?: Filter | null;
  // Absent from APIs older than scope-following filters.
  origin?: FilterOrigin;
  controls: Control[];
  components: SystemComponent[];
}

/** Used for creating a Dashboard: controls and components passed as arrays of IDs */
export interface DashboardCreate extends Omit<
  Dashboard,
  'controls' | 'components'
> {
  controls: string[];
  components: string[];
  // Make the filter follow its SSP's scope (`filter` becomes its scopeBase); false stops
  // a following filter from following. Needs `sspId` and a non-empty scope.
  followSspScope?: boolean;
}
