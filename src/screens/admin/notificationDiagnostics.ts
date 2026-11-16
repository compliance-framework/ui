import { isAxiosError, type AxiosError } from 'axios';
import { statuses, type StatusKey } from '@/ds/components/StatusBadge/statuses';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

/** Types, options and pure helpers for Diagnostics > Notifications and its sections. */

export type NotificationDestinationProvider = 'slack' | 'email';
export type NotificationStatus = 'pass' | 'warn' | 'warning' | 'fail' | 'error';

export interface NotificationDestination {
  provider: NotificationDestinationProvider;
  target: string;
}

export interface PredeterminedNotification {
  name: string;
  displayName: string;
  description: string;
  configuredDestinations: NotificationDestination[];
}

export interface NotificationConfigurationResponse {
  name: string;
  configuredDestinations: NotificationDestinationResponse[];
}

export type NotificationProviderMetadataValue = string | number | boolean;

export type NotificationProviderMetadata = Record<
  string,
  NotificationProviderMetadataValue
>;

export interface NotificationProviderInfo {
  providerType: string;
  displayName: string;
  description: string;
  enabled: boolean;
  error?: string;
  metadata?: NotificationProviderMetadata;
}

export interface NotificationDestinationPayload {
  providerType: NotificationDestinationProvider;
  destinationTarget: string;
}

export interface NotificationDestinationResponse {
  providerType: NotificationDestinationProvider;
  destinationTarget: string;
}

export interface NotificationHealthQueue {
  name: string;
  maxWorkers?: number;
  available?: number;
  retryable?: number;
  running?: number;
  scheduled?: number;
  completed24H?: number;
  discarded24H?: number;
  oldestAvailableAt?: string | null;
  staleCount?: number;
  staleThresholdSeconds?: number;
}

export interface NotificationHealthWarning {
  code: string;
  severity: string;
  message: string;
  target?: string;
}

export interface NotificationHealthNotification {
  name: string;
  configuredDestinations?: NotificationDestinationResponse[];
  subscriberCounts?: Record<string, number>;
  warnings?: NotificationHealthWarning[];
}

export interface NotificationHealthSchedule {
  name: string;
  jobKind: string;
  queue: string;
  enabled: boolean;
  schedule?: string;
  nextRunAt?: string | null;
  lastJob?: {
    id: number | string;
    state: string;
    createdAt?: string | null;
    finalizedAt?: string | null;
  } | null;
}

export interface NotificationHealthResponse {
  worker?: {
    enabled?: boolean;
    mode?: string;
    pollOnly?: boolean;
    queues?: NotificationHealthQueue[];
  };
  providers?: NotificationProviderInfo[];
  notifications?: NotificationHealthNotification[];
  schedules?: NotificationHealthSchedule[];
  warnings?: NotificationHealthWarning[];
}

export interface NotificationJob {
  id: number | string;
  state: string;
  queue: string;
  kind: string;
  attempt?: number;
  maxAttempts?: number;
  createdAt?: string | null;
  scheduledAt?: string | null;
  attemptedAt?: string | null;
  finalizedAt?: string | null;
  notificationKind?: string | null;
  provider?: string | null;
  target?: string | null;
  correlationId?: string | null;
  sourceJobKind?: string | null;
  sourceJobId?: string | number | null;
  lastError?: string | null;
  stale?: boolean;
}

export interface NotificationJobsResponse {
  data: NotificationJob[];
  pagination?: {
    nextCursor?: string | null;
  };
}

export interface NotificationJobDetail extends NotificationJob {
  metadata?: Record<string, unknown>;
  args?: Record<string, unknown>;
  errors?: Array<{
    attempt?: number;
    at?: string;
    error?: string;
  }>;
}

export interface NotificationDiagnosticsCheck {
  code: string;
  label: string;
  status: NotificationStatus;
  message: string;
  jobId?: number | string;
  correlationId?: string;
}

export interface NotificationDiagnosticsResponse {
  notificationName: string;
  status: NotificationStatus;
  checks: NotificationDiagnosticsCheck[];
  recommendedActions?: string[];
  subscriberCounts?: Record<string, number>;
  systemDestinations?: NotificationDestinationResponse[];
  destinations?: NotificationDestinationResponse[];
  configuredDestinations?: NotificationDestinationResponse[];
}

export interface NotificationTestResponse {
  accepted: boolean;
  mode: string;
  providerType: string;
  destinationTarget: string;
  jobIds?: Array<number | string>;
  message?: string;
}

export interface NotificationOption {
  label: string;
  value: string;
}

export const notificationDefinitions: Array<
  Omit<PredeterminedNotification, 'configuredDestinations'>
> = [
  {
    name: 'EVIDENCE_DIGEST',
    displayName: 'Evidence digest',
    description: 'A digest of all evidence submitted to the CCF platform',
  },
  {
    name: 'WORKFLOW_EXECUTION_FAILED',
    displayName: 'Workflow instance failure',
    description: 'Notification for failed workflow instances',
  },
];

export const queueOptions = [
  'email',
  'slack',
  'digest',
  'workflow',
  'risk',
  'poam',
  'scheduler',
];
export const providerFilterOptions = ['email', 'slack'];
export const stateOptions = [
  'available',
  'running',
  'retryable',
  'scheduled',
  'completed',
  'discarded',
];
// Only true notification kinds are listed here. The jobs endpoint filters on
// the `notification_kind` metadata, which scheduler/scanner/checker jobs do not
// carry, so including those kinds would yield filter options that never match.
export const notificationFilterOptions: NotificationOption[] = [
  { label: 'Evidence digest', value: 'evidence_digest' },
  { label: 'Workflow task assigned', value: 'workflow_task_assigned' },
  { label: 'Workflow task due soon', value: 'workflow_task_due_soon' },
  { label: 'Workflow task digest', value: 'workflow_task_digest' },
  { label: 'Workflow execution failed', value: 'workflow_execution_failed' },
  { label: 'Risk review due reminder', value: 'risk_review_due_reminder' },
  {
    label: 'Risk review overdue escalation',
    value: 'risk_review_overdue_escalation',
  },
  { label: 'Risk stale open reminder', value: 'risk_stale_open_reminder' },
  { label: 'Risk open digest', value: 'risk_open_digest' },
  { label: 'POAM deadline reminder', value: 'poam_deadline_reminder' },
  { label: 'POAM overdue notification', value: 'poam_overdue_notification' },
  {
    label: 'POAM milestone overdue reminder',
    value: 'poam_milestone_overdue_reminder',
  },
  { label: 'POAM open digest', value: 'poam_open_digest' },
];
export const diagnosticsNotificationOptions: NotificationOption[] = [
  { label: 'Evidence digest', value: 'EVIDENCE_DIGEST' },
  { label: 'Workflow notifications', value: 'WORKFLOW_EXECUTION_FAILED' },
  { label: 'Risk notifications', value: 'RISK_NOTIFICATIONS' },
  // { label: 'POAM notifications', value: 'POAM_NOTIFICATIONS' },
];
export const timeRangeOptions: NotificationOption[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All available', value: 'all' },
];
export const supportedProviders: Array<{
  label: string;
  value: NotificationDestinationProvider;
}> = [
  { label: 'Slack', value: 'slack' },
  { label: 'Email', value: 'email' },
];
const sensitiveFieldNames = [
  'token',
  'secret',
  'credential',
  'htmlbody',
  'textbody',
  'blocks',
  'attachments',
];

/** "serviceProviderName" → "Service provider name"; common acronyms stay upper case. */
export function formatMetadataLabel(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b(id|url|smtp|api|poam)\b/g, (word) => word.toUpperCase());

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatLabel(value?: string | null): string {
  if (!value) {
    return 'Not applicable';
  }

  return formatMetadataLabel(value);
}

export function formatNotificationName(value?: string | null): string {
  return formatLabel(value ?? '');
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function getProviderLabel(provider: string): string {
  return (
    supportedProviders.find((option) => option.value === provider)?.label ??
    formatLabel(provider)
  );
}

const statusKeys: Record<string, StatusKey> = {
  pass: 'check-pass',
  warn: 'check-warning',
  warning: 'check-warning',
  fail: 'check-fail',
  error: 'check-error',
  available: 'job-available',
  scheduled: 'job-scheduled',
  running: 'job-running',
  retryable: 'job-retryable',
  completed: 'job-completed',
  discarded: 'job-discarded',
};

/**
 * StatusBadge props for a check or job state; an unknown state keeps its own words. A stale job
 * reads "Stale, available".
 */
export function statusBadge(
  status: string,
  stale = false,
): { status: StatusKey; label?: string } {
  const key = statusKeys[status];
  const label = key ? statuses[key].label : formatLabel(status);

  return {
    status: key ?? 'unknown',
    label: stale ? `Stale, ${label.toLowerCase()}` : key ? undefined : label,
  };
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse<ErrorBody>>;
    const responseBody = axiosError.response?.data?.errors?.body;
    if (responseBody) {
      return responseBody;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function sinceForRange(range: string): string | undefined {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (range === '24h') {
    return new Date(now - day).toISOString();
  }

  if (range === '7d') {
    return new Date(now - 7 * day).toISOString();
  }

  if (range === '30d') {
    return new Date(now - 30 * day).toISOString();
  }

  return undefined;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sensitiveFieldNames.some((fieldName) =>
    normalized.includes(fieldName),
  );
}

export function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayload(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, entry]) => [key, sanitizePayload(entry)]),
    );
  }

  return value;
}

export function stringifyPayload(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(
      value,
      (_key, entry: unknown) => {
        if (typeof entry === 'bigint') {
          return entry.toString();
        }

        if (entry && typeof entry === 'object') {
          if (seen.has(entry)) {
            return '[Circular]';
          }

          seen.add(entry);
        }

        return entry;
      },
      2,
    );
  } catch {
    return 'Unable to display payload.';
  }
}
