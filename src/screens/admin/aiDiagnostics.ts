import type { StatusKey } from '@/ds/components/StatusBadge/statuses';

/** Types, endpoints and pure helpers for Diagnostics > AI suggestions. */

export type AiDiagnosticsStatus =
  'pending' | 'running' | 'completed' | 'failed';

export type AiDiagnosticsCheckStatus = 'pass' | 'warn' | 'fail';

export interface AiDiagnosticsConfig {
  model?: string;
  promptVersion?: string;
  maxControlsPerChunk?: number;
  maxLabelSetsPerChunk?: number;
  maxCallsPerRun?: number;
  queueWorkers?: number;
}

export interface AiDiagnosticsTotals {
  runs: number;
  runsByStatus: Record<AiDiagnosticsStatus, number>;
  cellsCompleted: number;
  cellsFailed: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheHitRatio: number;
  mappingsReturned: number;
  mappingsRejected: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  suggestionsPending: number;
  rateLimitedTotal: number;
}

export interface AiDiagnosticsQueue {
  name: string;
  maxWorkers?: number;
  available?: number;
  running?: number;
  retryable?: number;
  scheduled?: number;
  completed24h?: number;
  discarded24h?: number;
  oldestAvailableAt?: string | null;
}

export interface AiDiagnosticsCheck {
  id: string;
  status: AiDiagnosticsCheckStatus;
  message: string;
  recommendedActions?: string[];
}

export interface AiDiagnosticsSummary {
  enabled: boolean;
  config: AiDiagnosticsConfig;
  totals: AiDiagnosticsTotals;
  queue: AiDiagnosticsQueue | null;
  checks: AiDiagnosticsCheck[];
}

export interface AiDiagnosticsActor {
  id?: string;
  name?: string;
}

export interface AiDiagnosticsScope {
  controlKeys?: string[];
  labelSetHashes?: string[];
  labelSets?: Array<Record<string, string>>;
}

export interface AiDiagnosticsRun {
  id: string;
  sspId?: string;
  sspName?: string;
  status: AiDiagnosticsStatus;
  model?: string;
  promptVersion?: string;
  plannedCalls: number;
  completedCells: number;
  failedCells: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  cacheHitRatio: number;
  mappingsReturned: number;
  mappingsRejected: number;
  rateLimitedTotal: number;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  triggeredBy?: AiDiagnosticsActor | null;
  scope?: AiDiagnosticsScope;
}

export interface AiDiagnosticsCell {
  cellIndex: number;
  status: AiDiagnosticsStatus;
  controlKeys?: string[];
  labelSetHashes?: string[];
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  rateLimitedCount?: number;
  mappingsReturned?: number;
  mappingsRejected?: number;
  error?: string | null;
  completedAt?: string | null;
}

export interface AiDiagnosticsEvent {
  id?: string;
  uuid?: string;
  action?: string;
  actor?: string;
  message?: string;
  reasoning?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AiDiagnosticsRunDetail extends AiDiagnosticsRun {
  cells: AiDiagnosticsCell[];
  events: AiDiagnosticsEvent[];
}

export interface AiDiagnosticsRunsFilters {
  status?: string;
  sspId?: string;
  limit?: number;
  cursor?: string;
}

export interface AiDiagnosticsRunsMeta {
  nextCursor?: string | null;
}

export interface AiDiagnosticsRunsResponse {
  data: AiDiagnosticsRun[];
  meta?: AiDiagnosticsRunsMeta;
}

export function buildAiDiagnosticsSummaryEndpoint(): string {
  return '/api/admin/ai-diagnostics/summary';
}

export function buildAiDiagnosticsRunsEndpoint(
  filters: AiDiagnosticsRunsFilters = {},
): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.sspId) params.set('sspId', filters.sspId);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);

  const query = params.toString();
  return `/api/admin/ai-diagnostics/runs${query ? `?${query}` : ''}`;
}

export function buildAiDiagnosticsRunDetailEndpoint(runId: string): string {
  return `/api/admin/ai-diagnostics/runs/${encodeURIComponent(runId)}`;
}

function runDay(run: AiDiagnosticsRun): string | null {
  if (!run.startedAt) return null;

  const date = new Date(run.startedAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function sortedBucketEntries(runs: AiDiagnosticsRun[]) {
  const buckets = new Map<
    string,
    {
      inputTokens: number;
      cacheReadInputTokens: number;
      cacheCreationInputTokens: number;
      cacheHitRatioTotal: number;
      runCount: number;
    }
  >();

  for (const run of runs) {
    const day = runDay(run);
    if (!day) continue;

    const bucket = buckets.get(day) ?? {
      inputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheHitRatioTotal: 0,
      runCount: 0,
    };

    bucket.inputTokens += run.inputTokens ?? 0;
    bucket.cacheReadInputTokens += run.cacheReadInputTokens ?? 0;
    bucket.cacheCreationInputTokens += run.cacheCreationInputTokens ?? 0;
    bucket.cacheHitRatioTotal += run.cacheHitRatio ?? 0;
    bucket.runCount += 1;
    buckets.set(day, bucket);
  }

  return Array.from(buckets.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

/** A LineChart series: one value per run-start day. */
export interface AiDiagnosticsSeries {
  name: string;
  points: { x: string; y: number }[];
}

export function buildAiDiagnosticsTokenSeries(
  runs: AiDiagnosticsRun[],
): AiDiagnosticsSeries[] {
  const buckets = sortedBucketEntries(runs);

  return [
    {
      name: 'Input tokens',
      points: buckets.map(([day, bucket]) => ({
        x: day,
        y: bucket.inputTokens,
      })),
    },
    {
      name: 'Cache read tokens',
      points: buckets.map(([day, bucket]) => ({
        x: day,
        y: bucket.cacheReadInputTokens,
      })),
    },
    {
      name: 'Cache creation tokens',
      points: buckets.map(([day, bucket]) => ({
        x: day,
        y: bucket.cacheCreationInputTokens,
      })),
    },
  ];
}

export function buildAiDiagnosticsCacheHitSeries(
  runs: AiDiagnosticsRun[],
): AiDiagnosticsSeries[] {
  const buckets = sortedBucketEntries(runs);

  return [
    {
      name: 'Cache hit %',
      points: buckets.map(([day, bucket]) => ({
        x: day,
        y: bucket.runCount
          ? Math.round((bucket.cacheHitRatioTotal / bucket.runCount) * 100)
          : 0,
      })),
    },
  ];
}

/** A round axis maximum at or above `value`, e.g. 1,234 → 2,000, so the ticks read cleanly. */
export function niceAxisMax(value: number): number {
  if (value <= 0) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

/** A ratio (0.42) or a percentage (42) as "42%". */
export function formatPercent(value?: number | null): string {
  const numeric = value ?? 0;
  const percent = numeric > 1 ? numeric : numeric * 100;
  return `${Math.round(percent)}%`;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDuration(value?: number | null): string {
  if (!value) return 'N/A';

  if (value < 1000) return `${value} ms`;

  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/** "cache_engaging" → "Cache engaging". */
export function formatLabel(value?: string | null): string {
  if (!value) return 'N/A';

  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatScopeList(values?: string[]): string {
  return values?.length ? values.join(', ') : 'All';
}

export function formatLabelSet(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return 'None';
  return entries.map(([key, value]) => `${key}=${value}`).join(', ');
}

const runStatusKeys: Record<AiDiagnosticsStatus, StatusKey> = {
  pending: 'suggestion-run-pending',
  running: 'suggestion-run-running',
  completed: 'suggestion-run-completed',
  failed: 'suggestion-run-failed',
};

export function runStatusKey(status: AiDiagnosticsStatus): StatusKey {
  return runStatusKeys[status] ?? 'unknown';
}

export function checkStatusKey(status: AiDiagnosticsCheckStatus): StatusKey {
  if (status === 'pass') return 'check-pass';
  if (status === 'fail') return 'check-fail';
  return 'check-warning';
}
