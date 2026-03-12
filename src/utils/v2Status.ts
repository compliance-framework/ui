export type V2StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface V2StatusMeta {
  label: string;
  tone: V2StatusTone;
}

const STATUS_MAP: Record<string, V2StatusMeta> = {
  active: { label: 'Active', tone: 'success' },
  enabled: { label: 'Enabled', tone: 'success' },
  complete: { label: 'Complete', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  satisfied: { label: 'Satisfied', tone: 'success' },
  passed: { label: 'Passed', tone: 'success' },
  approved: { label: 'Approved', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  queued: { label: 'Queued', tone: 'warning' },
  warning: { label: 'Warning', tone: 'warning' },
  needs_evidence: { label: 'Needs Evidence', tone: 'warning' },
  draft: { label: 'Draft', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'info' },
  implemented: { label: 'Implemented', tone: 'info' },
  partially_implemented: { label: 'Partially Implemented', tone: 'info' },
  running: { label: 'Running', tone: 'info' },
  paused: { label: 'Paused', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
  error: { label: 'Error', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'danger' },
  not_satisfied: { label: 'Not Satisfied', tone: 'danger' },
  'not-satisfied': { label: 'Not Satisfied', tone: 'danger' },
  disabled: { label: 'Disabled', tone: 'neutral' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
  unknown: { label: 'Unknown', tone: 'neutral' },
};

function humanize(rawStatus: string): string {
  return rawStatus
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getV2StatusMeta(status?: string | null): V2StatusMeta {
  if (!status || status.trim().length === 0) {
    return STATUS_MAP.unknown;
  }

  const normalized = status.trim().toLowerCase();
  const mapped = STATUS_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  return {
    label: humanize(normalized),
    tone: 'neutral',
  };
}
