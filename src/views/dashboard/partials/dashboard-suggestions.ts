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

export interface SuggestionRunFailure {
  controlKey?: string;
  labelSetHash?: string;
  message?: string;
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
  failures?: SuggestionRunFailure[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSuggestion {
  id: string;
  uuid?: string;
  status: DashboardSuggestionStatus;
  controlId: string;
  controlTitle?: string;
  labelSetHash: string;
  labels: Record<string, string>;
  confidence?: number;
  reasoning?: string;
  controlFitReasoning?: string;
  systemRelevanceReasoning?: string;
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

export function buildDashboardSuggestionRunEndpoint(
  sspId: string,
  runId: string,
): string {
  return `${dashboardSuggestionsBaseEndpoint(sspId)}/dashboard-suggestion-runs/${encodeURIComponent(runId)}`;
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

export function getSuggestionId(suggestion: DashboardSuggestion): string {
  return suggestion.uuid ?? suggestion.id;
}

export function formatLabelSet(labels: Record<string, string>): string[] {
  return Object.entries(labels).map(([key, value]) => `${key}=${value}`);
}

export function isRunActive(run: SuggestionRun | undefined): boolean {
  return run?.status === 'pending' || run?.status === 'running';
}
