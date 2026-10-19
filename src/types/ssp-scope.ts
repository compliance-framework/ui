// SSP scope: the labels that identify an SSP's evidence. Evidence is in scope when it
// matches ANY entry; it matches an entry when it carries ALL of the entry's labels.
//
// The scope routes are kebab-case OSCAL-style sub-resources of the SSP. Responses arrive
// camelCased by the global interceptor (`auto-filters` -> `autoFilters`). Labels are
// arrays of `{ key, value }` objects, so the camelCase/kebab-case conversions never touch
// a label key.

export interface ScopeLabel {
  key: string;
  value: string;
}

export type ScopeEntryOrigin = 'manual' | 'template';

export interface ScopeEntry {
  id: string;
  labels: ScopeLabel[];
  origin: ScopeEntryOrigin;
  templateId?: string | null;
  createdAt: string;
}

export interface ScopeException {
  id: string;
  labels: ScopeLabel[];
  createdAt: string;
}

export interface SspScope {
  autoFilters: boolean;
  entries: ScopeEntry[];
  exceptions: ScopeException[];
}
