import type { ChartData } from 'chart.js';

export type AiDiagnosticsStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

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

export function buildAiDiagnosticsTokenChartData(
  runs: AiDiagnosticsRun[],
): ChartData<'line'> {
  const buckets = sortedBucketEntries(runs);

  return {
    labels: buckets.map(([day]) => day),
    datasets: [
      {
        label: 'Input tokens',
        data: buckets.map(([, bucket]) => bucket.inputTokens),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Cache read tokens',
        data: buckets.map(([, bucket]) => bucket.cacheReadInputTokens),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Cache creation tokens',
        data: buckets.map(([, bucket]) => bucket.cacheCreationInputTokens),
        borderColor: '#d97706',
        backgroundColor: 'rgba(217, 119, 6, 0.12)',
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      },
    ],
  };
}

export function buildAiDiagnosticsCacheHitChartData(
  runs: AiDiagnosticsRun[],
): ChartData<'line'> {
  const buckets = sortedBucketEntries(runs);

  return {
    labels: buckets.map(([day]) => day),
    datasets: [
      {
        label: 'Cache hit %',
        data: buckets.map(([, bucket]) =>
          bucket.runCount
            ? Math.round((bucket.cacheHitRatioTotal / bucket.runCount) * 100)
            : 0,
        ),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.12)',
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      },
    ],
  };
}
