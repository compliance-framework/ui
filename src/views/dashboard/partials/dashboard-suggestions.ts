import type { Filter as LabelFilter } from '@/parsers/labelfilter';

export type { LabelFilter };

export type DashboardSuggestionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export type SuggestionRunStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface DashboardSuggestionLabelSet {
  hash: string;
  labels: Record<string, string>;
  evidenceCount: number;
  sampleTitles?: string[];
}

// A distinct evidence label key with its distinct values, used to populate the
// evidence-scoping filter builder without loading every label set.
export interface DashboardSuggestionLabelKey {
  key: string;
  values: string[];
}

// One key=value row in a label-condition builder (value "" means "any value").
export interface LabelConditionRow {
  key: string;
  value: string;
}

export interface DashboardSuggestionScope {
  controlKeys?: string[];
  labelSetHashes?: string[];
  // Evidence-scoping label filter (same shape as the evidence-search filter).
  labelFilter?: LabelFilter;
}

// A mandatory/excluded label selector. A null/undefined value matches any value
// for the key (key-only selector); a string value requires an exact match.
export interface LabelSelector {
  key: string;
  value?: string | null;
}

export type SuggestionActionScope = '' | 'new_filter' | 'extend_filter';

export interface DashboardSuggestionConstraints {
  mandatoryLabels?: LabelSelector[];
  excludedLabels?: LabelSelector[];
  // Restrict suggestions to creating new filters or extending existing ones.
  onlyAction?: SuggestionActionScope;
  // Scope generation to controls that have no dashboard filter attached.
  onlyControlsWithoutFilters?: boolean;
}

export interface GenerateDashboardSuggestionsPayload {
  supersedePending?: boolean;
  scope?: DashboardSuggestionScope;
  constraints?: DashboardSuggestionConstraints;
}

export interface EditDashboardSuggestionGroupPayload {
  ids: string[];
  proposedFilterName?: string;
  proposedFilterLabelSet?: Record<string, string>;
  addControlKeys?: string[];
  removeIds?: string[];
}

export interface DashboardSuggestionsPreview {
  plannedCalls: number;
  controlCount: number;
  labelSetCount: number;
}

// A single failed cell, as reported in `run.stats.failedCells`. The API stores
// these under `stats.failed_cells` (camelCased on the way in). Note it carries
// only the cell index and error message — control/label-set detail is not
// included in the run summary response.
export interface SuggestionRunCellFailure {
  cellIndex?: number;
  error?: string;
}

// Free-form run statistics (`stats` jsonb). Only the fields the UI reads are
// typed here; the backend may include additional keys.
export interface SuggestionRunStats {
  cellsCompleted?: number;
  cellsFailed?: number;
  failedCells?: SuggestionRunCellFailure[];
  mappingsReturned?: number;
  mappingsRejected?: number;
}

export interface SuggestionRun {
  id?: string;
  uuid?: string;
  status: SuggestionRunStatus;
  plannedCalls: number;
  completedCells: number;
  failedCells: number;
  scope?: DashboardSuggestionScope;
  error?: string;
  stats?: SuggestionRunStats;
  createdAt?: string;
  updatedAt?: string;
}

export function runCellFailures(
  run: SuggestionRun | undefined,
): SuggestionRunCellFailure[] {
  return run?.stats?.failedCells ?? [];
}

export interface DashboardSuggestion {
  id: string;
  uuid?: string;
  status: DashboardSuggestionStatus;
  controlId: string;
  controlCatalogId?: string;
  controlTitle?: string;
  labelSetHash: string;
  labelSet?: Record<string, string>;
  labels?: Record<string, string>;
  // Subset of labels that defines the proposed dashboard filter. This is what
  // the suggested dashboard actually filters on, and is usually a small subset
  // of the originating evidence's full `labelSet`.
  proposedFilterLabelSet?: Record<string, string>;
  confidence?: number;
  reasoning?: string;
  action?: 'create' | 'extend';
  proposedFilterName?: string;
  targetFilterId?: string;
  targetFilterName?: string;
  evidenceCount?: number;
  isUserEdited?: boolean;
  editedByUserId?: string;
  editedAt?: string;
  // AI baseline captured at first edit, for rendering the diff on the card.
  originalProposedFilterLabelSet?: Record<string, string>;
  originalProposedFilterName?: string;
  addedByUser?: boolean;
  removedControlIds?: string[];
  // Marks rows produced by the deterministic filter-merge detector. Such a row
  // proposes the generalized label set that merges several near-duplicate
  // filters; `sourceFilterIds` are the filters it merges.
  isGeneralization?: boolean;
  sourceFilterIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type ControlSuggestionOutcome = 'matched' | 'no_match';

export interface ControlSuggestionResult {
  controlId: string;
  controlCatalogId?: string;
  outcome: ControlSuggestionOutcome;
  suggestionCount?: number;
  runId?: string;
  evaluatedAt?: string;
}

export type LabelChipKind = 'unchanged' | 'added' | 'removed';

export interface LabelChip {
  text: string;
  kind: LabelChipKind;
}

export interface GroupEditDiff {
  labelChips: LabelChip[];
  titleFrom?: string;
  titleTo?: string;
  addedControlIds: string[];
  removedControlIds: string[];
  edited: boolean;
}

// Computes the visual diff of a pending group versus its AI baseline. Added
// labels are green, removed labels red; a changed value shows both. Title change
// and control add/remove are surfaced for the card.
export function computeGroupEditDiff(
  suggestions: DashboardSuggestion[],
  currentLabels: Record<string, string>,
): GroupEditDiff {
  const baselineRow = suggestions.find(
    (s) =>
      s.originalProposedFilterLabelSet &&
      Object.keys(s.originalProposedFilterLabelSet).length > 0,
  );
  const baseline = baselineRow?.originalProposedFilterLabelSet;
  const originalName = suggestions.find(
    (s) => s.originalProposedFilterName,
  )?.originalProposedFilterName;
  const currentName = suggestions.find(
    (s) => s.proposedFilterName,
  )?.proposedFilterName;
  const removedControlIds =
    suggestions.find((s) => s.removedControlIds?.length)?.removedControlIds ??
    [];
  const addedControlIds = suggestions
    .filter((s) => s.addedByUser)
    .map((s) => s.controlId);
  const edited = suggestions.some((s) => s.isUserEdited);

  const labelChips: LabelChip[] = [];
  const keys = new Set<string>([
    ...Object.keys(currentLabels),
    ...(baseline ? Object.keys(baseline) : []),
  ]);
  for (const key of Array.from(keys).sort()) {
    const current = currentLabels[key];
    const base = baseline?.[key];
    if (!baseline) {
      labelChips.push({ text: `${key}=${current}`, kind: 'unchanged' });
    } else if (current !== undefined && base === undefined) {
      labelChips.push({ text: `${key}=${current}`, kind: 'added' });
    } else if (current === undefined && base !== undefined) {
      labelChips.push({ text: `${key}=${base}`, kind: 'removed' });
    } else if (current !== base) {
      labelChips.push({ text: `${key}=${base}`, kind: 'removed' });
      labelChips.push({ text: `${key}=${current}`, kind: 'added' });
    } else {
      labelChips.push({ text: `${key}=${current}`, kind: 'unchanged' });
    }
  }

  const titleChanged =
    !!originalName && !!currentName && originalName !== currentName;

  return {
    labelChips,
    titleFrom: titleChanged ? originalName : undefined,
    titleTo: titleChanged ? currentName : undefined,
    addedControlIds,
    removedControlIds,
    edited,
  };
}

export interface DashboardSuggestionEvent {
  id?: string;
  uuid?: string;
  action?: string;
  actor?: string;
  reasoning?: string;
  resultingFilterId?: string;
  resultingFilterName?: string;
  createdAt?: string;
}

export function dashboardSuggestionsBaseEndpoint(sspId: string): string {
  return `/api/oscal/system-security-plans/${encodeURIComponent(sspId)}`;
}

export function buildDashboardSuggestionsConfigEndpoint(): string {
  return '/api/dashboard-suggestions/config';
}

export function buildGenerateDashboardSuggestionsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/generate`;
}

export function buildPreviewDashboardSuggestionsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/preview`;
}

export function buildGeneralizeDashboardSuggestionsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/generalize`;
}

// Result of triggering the deterministic filter-merge detector.
export interface GeneralizeDashboardSuggestionsResult {
  candidates: number;
  inserted: number;
}

export function buildDashboardSuggestionLabelSetsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/label-sets`;
}

export function buildDashboardSuggestionLabelKeysEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/label-keys`;
}

export function buildDashboardSuggestionLabelValuesEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/label-values`;
}

// Builds a labelfilter.Filter from a list of AND-ed key=value conditions, or
// undefined when there are no conditions. Single condition collapses to a bare
// scope.condition; multiple become a scope.query with an AND operator.
export function buildLabelFilter(
  conditions: { key: string; value: string }[],
): LabelFilter | undefined {
  const valid = conditions.filter((c) => c.key.trim() && c.value.trim());
  if (valid.length === 0) {
    return undefined;
  }
  const scopes = valid.map((c) => ({
    condition: {
      label: c.key.trim(),
      operator: '=' as const,
      value: c.value.trim(),
    },
  }));
  if (scopes.length === 1) {
    return { scope: scopes[0] };
  }
  return { scope: { query: { operator: 'AND' as const, scopes } } };
}

export function buildLatestDashboardSuggestionRunEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestion-runs/latest`;
}

export function buildDashboardSuggestionsEndpoint(
  sspId: string,
  status?: string,
): string {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions${query}`;
}

export function buildDashboardSuggestionControlResultsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/control-results`;
}

export function buildAcceptDashboardSuggestionsEndpoint(sspId: string): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/accept`;
}

export function buildRejectDashboardSuggestionsEndpoint(sspId: string): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/reject`;
}

export function buildEditDashboardSuggestionGroupEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/edit-group`;
}

export function buildDashboardSuggestionEventsEndpoint(
  sspId: string,
  suggestionId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/${encodeURIComponent(suggestionId)}/events`;
}

// Builds the catalog-qualified control key the API expects (`<catalogId>:<controlId>`).
export function buildControlKey(catalogId: string, controlId: string): string {
  return `${catalogId}:${controlId}`;
}

export function formatLabelSet(labels: Record<string, string>): string[] {
  return Object.entries(labels).map(([key, value]) => `${key}=${value}`);
}

// Labels whose key starts with `_` are internal and hidden from the UI.
export function formatVisibleLabelSet(
  labels: Record<string, string>,
): string[] {
  return Object.entries(labels)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key}=${value}`);
}

export function isRunActive(run: SuggestionRun | undefined): boolean {
  return run?.status === 'pending' || run?.status === 'running';
}
