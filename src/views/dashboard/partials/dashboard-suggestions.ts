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

export interface DashboardSuggestionScope {
  controlKeys?: string[];
  labelSetHashes?: string[];
}

export interface GenerateDashboardSuggestionsPayload {
  supersedePending?: boolean;
  scope?: DashboardSuggestionScope;
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
  createdAt?: string;
  updatedAt?: string;
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

export function buildDashboardSuggestionLabelSetsEndpoint(
  sspId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/label-sets`;
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

export function buildAcceptDashboardSuggestionsEndpoint(sspId: string): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/accept`;
}

export function buildRejectDashboardSuggestionsEndpoint(sspId: string): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/reject`;
}

export function buildDashboardSuggestionEventsEndpoint(
  sspId: string,
  suggestionId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestions/${encodeURIComponent(suggestionId)}/events`;
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
