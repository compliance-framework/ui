import type { IconName } from '../Icon/icons';

/** Colour roles a status can take; each maps to a --color-status-* or --color-risk-* token pair. */
export type StatusTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'risk-low'
  | 'risk-high';

export interface StatusDefinition {
  label: string;
  tone: StatusTone;
  icon: IconName;
}

/**
 * The one domain status vocabulary (F-12 AC4). Create, edit, filter, heatmap, admin and every
 * badge read labels, tones and icons from here, so a status never has two names or two icons.
 * Icons follow the polarity of the status (F-12 AC5): nothing negative or pending shows a check.
 * Risk levels use the bar-count level icons (D-08).
 */
export const statuses = {
  'suggestion-pending': { label: 'Pending', tone: 'warning', icon: 'planned' },
  'suggestion-accepted': { label: 'Accepted', tone: 'success', icon: 'check' },
  'suggestion-rejected': { label: 'Rejected', tone: 'error', icon: 'close' },
  'suggestion-superseded': {
    label: 'Superseded',
    tone: 'neutral',
    icon: 'locked',
  },
  'suggestion-run-pending': {
    label: 'Pending',
    tone: 'warning',
    icon: 'planned',
  },
  'suggestion-run-running': {
    label: 'Running',
    tone: 'info',
    icon: 'inProgress',
  },
  'suggestion-run-completed': {
    label: 'Completed',
    tone: 'success',
    icon: 'check',
  },
  'suggestion-run-failed': { label: 'Failed', tone: 'error', icon: 'close' },
  'needs-evidence': {
    label: 'Needs evidence',
    tone: 'warning',
    icon: 'warning',
  },
  'out-of-scope': { label: 'Out of scope', tone: 'neutral', icon: 'forbidden' },
  'heat-neutral': { label: 'No open risk', tone: 'neutral', icon: 'riskOpen' },
  'heat-low': { label: 'Low open risk', tone: 'risk-low', icon: 'levelLow' },
  'heat-moderate': {
    label: 'Moderate open risk',
    tone: 'warning',
    icon: 'levelModerate',
  },
  'heat-high': {
    label: 'High open risk',
    tone: 'risk-high',
    icon: 'levelHigh',
  },
  'heat-critical': {
    label: 'Critical open risk',
    tone: 'error',
    icon: 'levelCritical',
  },
  'catalog-active': { label: 'Active', tone: 'success', icon: 'success' },
  'catalog-inactive': { label: 'Inactive', tone: 'neutral', icon: 'paused' },
  // evidence results
  satisfied: { label: 'Satisfied', tone: 'success', icon: 'success' },
  'not-satisfied': { label: 'Not satisfied', tone: 'error', icon: 'error' },
  unknown: { label: 'Unknown', tone: 'neutral', icon: 'unknown' },
  expired: { label: 'Expired', tone: 'warning', icon: 'expired' },
  'risk-unrated': { label: 'Not rated', tone: 'neutral', icon: 'unknown' },
  'item-open': { label: 'Open', tone: 'neutral', icon: 'riskOpen' },
  'item-in-progress': {
    label: 'In progress',
    tone: 'info',
    icon: 'inProgress',
  },
  'item-completed': { label: 'Completed', tone: 'success', icon: 'success' },
  'item-overdue': { label: 'Overdue', tone: 'warning', icon: 'expired' },
  'item-cancelled': { label: 'Cancelled', tone: 'neutral', icon: 'locked' },
  'item-risk-accepted': {
    label: 'Risk accepted',
    tone: 'neutral',
    icon: 'accepted',
  },
  // risk levels, Negligible → Critical
  'risk-negligible': {
    label: 'Negligible',
    tone: 'neutral',
    icon: 'levelNegligible',
  },
  'risk-low': { label: 'Low', tone: 'risk-low', icon: 'levelLow' },
  'risk-moderate': {
    label: 'Moderate',
    tone: 'warning',
    icon: 'levelModerate',
  },
  'risk-high': { label: 'High', tone: 'risk-high', icon: 'levelHigh' },
  'risk-critical': { label: 'Critical', tone: 'error', icon: 'levelCritical' },
  // system authorization
  authorized: { label: 'Authorized', tone: 'success', icon: 'success' },
  'in-progress': { label: 'In progress', tone: 'info', icon: 'inProgress' },
  'not-authorized': {
    label: 'Not authorized',
    tone: 'neutral',
    icon: 'unknown',
  },
  // risk lifecycle (Q10: the current app's seven): level carries severity, so status stays calm
  'risk-open': { label: 'Open', tone: 'neutral', icon: 'riskOpen' },
  'risk-investigating': {
    label: 'Investigating',
    tone: 'info',
    icon: 'investigating',
  },
  'risk-mitigating-planned': {
    label: 'Mitigating planned',
    tone: 'info',
    icon: 'planned',
  },
  'risk-mitigating-implemented': {
    label: 'Mitigating implemented',
    tone: 'info',
    icon: 'inProgress',
  },
  'risk-accepted': {
    label: 'Risk accepted',
    tone: 'neutral',
    icon: 'accepted',
  },
  'risk-remediated': { label: 'Remediated', tone: 'success', icon: 'success' },
  'risk-closed': { label: 'Closed', tone: 'neutral', icon: 'locked' },
  // control implementation
  implemented: { label: 'Implemented', tone: 'success', icon: 'success' },
  partial: { label: 'Partial', tone: 'warning', icon: 'partial' },
  planned: { label: 'Planned', tone: 'info', icon: 'planned' },
  alternative: { label: 'Alternative', tone: 'info', icon: 'inProgress' },
  'not-applicable': {
    label: 'Not applicable',
    tone: 'neutral',
    icon: 'forbidden',
  },
  'no-status': { label: 'No status', tone: 'neutral', icon: 'unknown' },
  // impact level (FIPS 199): the same words and bar icons as the risk level scale
  'impact-low': { label: 'Low', tone: 'risk-low', icon: 'levelLow' },
  'impact-moderate': {
    label: 'Moderate',
    tone: 'warning',
    icon: 'levelModerate',
  },
  'impact-high': { label: 'High', tone: 'risk-high', icon: 'levelHigh' },
  // operational status of a system or component
  operational: { label: 'Operational', tone: 'success', icon: 'success' },
  'under-development': {
    label: 'Under development',
    tone: 'info',
    icon: 'inProgress',
  },
  'under-major-modification': {
    label: 'Under major modification',
    tone: 'warning',
    icon: 'partial',
  },
  disposition: { label: 'Disposition', tone: 'neutral', icon: 'locked' },
  other: { label: 'Other', tone: 'neutral', icon: 'unknown' },
  // offerings a system shares, and capabilities it inherits
  'offering-draft': { label: 'Draft', tone: 'neutral', icon: 'edit' },
  'offering-published': {
    label: 'Published',
    tone: 'success',
    icon: 'success',
  },
  'offering-deprecated': {
    label: 'Deprecated',
    tone: 'warning',
    icon: 'warning',
  },
  'offering-revoked': { label: 'Revoked', tone: 'neutral', icon: 'forbidden' },
  'capability-active': { label: 'Active', tone: 'success', icon: 'success' },
  'capability-drifted': { label: 'Drifted', tone: 'warning', icon: 'warning' },
  'capability-revoked': { label: 'Revoked', tone: 'error', icon: 'forbidden' },
  'capability-superseded': {
    label: 'Superseded',
    tone: 'neutral',
    icon: 'locked',
  },
  inherited: { label: 'Inherited', tone: 'info', icon: 'components' },
  'run-pending': { label: 'Pending', tone: 'neutral', icon: 'planned' },
  // workflow instances and their runs
  'workflow-active': { label: 'Active', tone: 'success', icon: 'inProgress' },
  'workflow-paused': { label: 'Paused', tone: 'neutral', icon: 'paused' },
  'run-completed': { label: 'Completed', tone: 'success', icon: 'success' },
  'run-failed': { label: 'Failed', tone: 'error', icon: 'error' },
  'run-in-progress': { label: 'In progress', tone: 'info', icon: 'inProgress' },
  'run-cancelled': { label: 'Cancelled', tone: 'neutral', icon: 'close' },
  'run-overdue': { label: 'Overdue', tone: 'warning', icon: 'warning' },
  'step-pending': { label: 'Pending', tone: 'neutral', icon: 'planned' },
  'step-blocked': { label: 'Blocked', tone: 'neutral', icon: 'locked' },
  'step-in-progress': {
    label: 'In progress',
    tone: 'info',
    icon: 'inProgress',
  },
  'step-completed': { label: 'Completed', tone: 'success', icon: 'success' },
  'step-failed': { label: 'Failed', tone: 'error', icon: 'error' },
  'step-skipped': { label: 'Skipped', tone: 'neutral', icon: 'next' },
  'step-overdue': { label: 'Overdue', tone: 'warning', icon: 'warning' },
  // diagnostic checks (notifications, AI suggestions)
  'check-pass': { label: 'Passed', tone: 'success', icon: 'success' },
  'check-warning': { label: 'Warning', tone: 'warning', icon: 'warning' },
  'check-fail': { label: 'Failed', tone: 'error', icon: 'error' },
  'check-error': { label: 'Error', tone: 'error', icon: 'error' },
  // background jobs (notification deliveries)
  'job-available': { label: 'Available', tone: 'warning', icon: 'planned' },
  'job-scheduled': { label: 'Scheduled', tone: 'neutral', icon: 'date' },
  'job-running': { label: 'Running', tone: 'info', icon: 'inProgress' },
  'job-retryable': { label: 'Retryable', tone: 'warning', icon: 'warning' },
  'job-completed': { label: 'Completed', tone: 'success', icon: 'success' },
  'job-discarded': { label: 'Discarded', tone: 'error', icon: 'error' },
  // notification providers
  'provider-enabled': { label: 'Enabled', tone: 'success', icon: 'success' },
  'provider-disabled': { label: 'Disabled', tone: 'neutral', icon: 'paused' },
} as const satisfies Record<string, StatusDefinition>;

export type StatusKey = keyof typeof statuses;

/** The fg/bg token pair for a tone, as custom properties a component binds with :style. */
export function toneVars(
  tone: StatusTone,
): Record<'--tone-fg' | '--tone-bg', string> {
  const role = tone.startsWith('risk-') ? tone : `status-${tone}`;
  return {
    '--tone-fg': `var(--ds-color-${role}-fg)`,
    '--tone-bg': `var(--ds-color-${role}-bg)`,
  };
}

/** Counts per status in words from this vocabulary, e.g. "18 implemented, 4 partial". */
export function countsSentence(
  segments: { status: StatusKey; count: number }[],
): string {
  return segments
    .map(
      (segment) =>
        `${segment.count} ${statuses[segment.status].label.toLowerCase()}`,
    )
    .join(', ');
}

/** The badge for a risk status; "risk-accepted" is already prefixed. */
export function riskStatusKey(status: string): StatusKey {
  return (status === 'risk-accepted' ? status : `risk-${status}`) as StatusKey;
}
