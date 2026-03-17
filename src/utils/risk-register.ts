import type { Risk } from '@/oscal';

export interface RiskSummary {
  total: number;
  open: number;
  accepted: number;
  overdueReviews: number;
}

export interface RiskFilters {
  search: string;
  status: string;
  likelihood: string;
  impact: string;
  owner: string;
  review: 'all' | 'overdue' | 'upcoming';
  controlId: string;
  evidenceId: string;
}

export type RiskSortBy =
  | 'updated'
  | 'created'
  | 'review-deadline'
  | 'status'
  | 'likelihood'
  | 'impact';

export type SortDirection = 'asc' | 'desc';
export type RiskSeverityLevel =
  | 'unknown'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export const defaultRiskFilters: RiskFilters = {
  search: '',
  status: 'all',
  likelihood: 'all',
  impact: 'all',
  owner: '',
  review: 'all',
  controlId: '',
  evidenceId: '',
};

type LooseRisk = Risk & Record<string, unknown>;
type LooseRecord = Record<string, unknown>;

function toLower(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function scalarFromObject(item: unknown, keys: string[]): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const source = item as LooseRecord;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function hintFromRemarks(
  remarks: unknown,
  label: 'likelihood' | 'impact',
): string | undefined {
  if (typeof remarks !== 'string' || !remarks.trim()) return undefined;

  const matcher =
    label === 'likelihood'
      ? /likelihood\s*hint\s*:\s*([^\n\r]+)/i
      : /impact\s*hint\s*:\s*([^\n\r]+)/i;

  const match = remarks.match(matcher);
  if (!match?.[1]) return undefined;
  return match[1].trim();
}

function valuesFromUnknown(
  value: unknown,
  keys: string[],
  target: Set<string>,
): void {
  if (!value) return;

  if (typeof value === 'string') {
    if (value.trim()) target.add(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => valuesFromUnknown(entry, keys, target));
    return;
  }

  if (typeof value === 'object') {
    const extracted = scalarFromObject(value, keys);
    if (extracted) {
      target.add(extracted);
    }
  }
}

function fieldValue(risk: LooseRisk, key: string): unknown {
  return risk[key];
}

function facetValue(risk: Risk, facetName: string): string | undefined {
  const name = toLower(facetName);
  const characterizations = risk.characterizations || [];

  for (const characterization of characterizations) {
    for (const facet of characterization.facets || []) {
      if (toLower(facet.name) === name && facet.value?.trim()) {
        return facet.value.trim();
      }
    }
  }

  return undefined;
}

export function normalizeRiskStatus(status?: string): string {
  return toLower(status);
}

export function isAcceptedStatus(status?: string): boolean {
  const normalized = normalizeRiskStatus(status);
  return normalized === 'accepted' || normalized === 'risk-accepted';
}

export function isClosedStatus(status?: string): boolean {
  const normalized = normalizeRiskStatus(status);
  return (
    normalized === 'closed' ||
    normalized === 'resolved' ||
    normalized === 'complete'
  );
}

export function isOpenStatus(status?: string): boolean {
  if (!status) return false;
  return !isClosedStatus(status) && !isAcceptedStatus(status);
}

export function getRiskCreatedAt(risk: Risk): string | undefined {
  const loose = risk as LooseRisk;
  return (
    scalarFromObject(loose, ['createdAt', 'created', 'createdOn']) ||
    scalarFromObject(loose, ['dateCreated'])
  );
}

export function getRiskUpdatedAt(risk: Risk): string | undefined {
  const loose = risk as LooseRisk;
  return (
    scalarFromObject(loose, ['updatedAt', 'updated', 'updatedOn']) ||
    scalarFromObject(loose, ['lastModified', 'lastReviewed'])
  );
}

export function getRiskReviewDeadline(risk: Risk): string | undefined {
  const loose = risk as LooseRisk;
  const explicit = scalarFromObject(loose, [
    'reviewDeadline',
    'reviewBy',
    'nextReviewAt',
  ]);
  return explicit || risk.deadline;
}

export function getRiskLikelihood(risk: Risk): string {
  const loose = risk as LooseRisk;
  const value =
    scalarFromObject(loose, ['likelihood', 'likelihoodHint']) ||
    facetValue(risk, 'likelihood') ||
    hintFromRemarks(loose.remarks, 'likelihood');
  return toLower(value);
}

export function getRiskImpact(risk: Risk): string {
  const loose = risk as LooseRisk;
  const value =
    scalarFromObject(loose, ['impact', 'impactHint']) ||
    facetValue(risk, 'impact') ||
    hintFromRemarks(loose.remarks, 'impact');
  return toLower(value);
}

export function getRiskSeverityScore(risk: Risk): number {
  return normalizeLevel(getRiskLikelihood(risk)) * normalizeLevel(getRiskImpact(risk));
}

export function getRiskSeverityLevelFromScore(
  score: number,
): RiskSeverityLevel {
  if (score >= 12) return 'critical';
  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 1) return 'low';
  return 'unknown';
}

export function getRiskSeverityLevel(risk: Risk): RiskSeverityLevel {
  return getRiskSeverityLevelFromScore(getRiskSeverityScore(risk));
}

export function getRiskOwnerDisplay(risk: Risk): string {
  const loose = risk as LooseRisk;
  const direct = scalarFromObject(loose, ['ownerName', 'owner', 'assignedTo']);
  if (direct) return direct;

  const owners = fieldValue(loose, 'owners');
  if (Array.isArray(owners)) {
    const names = owners
      .map((item) =>
        scalarFromObject(item, ['name', 'displayName', 'email', 'id']),
      )
      .filter((item): item is string => !!item);
    if (names.length) return names.join(', ');
  }

  return '';
}

export function getRiskControlIds(risk: Risk): string[] {
  const loose = risk as LooseRisk;
  const values = new Set<string>();
  valuesFromUnknown(
    fieldValue(loose, 'controlIds'),
    ['id', 'controlId'],
    values,
  );
  valuesFromUnknown(
    fieldValue(loose, 'relatedControls'),
    ['controlId', 'id', 'uuid'],
    values,
  );
  valuesFromUnknown(
    fieldValue(loose, 'controlLinks'),
    ['controlId', 'id', 'uuid'],
    values,
  );
  valuesFromUnknown(fieldValue(loose, 'controls'), ['controlId', 'id'], values);
  return Array.from(values);
}

export function getRiskEvidenceIds(risk: Risk): string[] {
  const loose = risk as LooseRisk;
  const values = new Set<string>();
  valuesFromUnknown(
    fieldValue(loose, 'evidenceIds'),
    ['id', 'evidenceId', 'uuid'],
    values,
  );
  valuesFromUnknown(
    fieldValue(loose, 'relatedEvidence'),
    ['evidenceId', 'evidenceUuid', 'id', 'uuid'],
    values,
  );
  valuesFromUnknown(fieldValue(loose, 'evidence'), ['id', 'uuid'], values);
  return Array.from(values);
}

export function getRiskComponentIds(risk: Risk): string[] {
  const loose = risk as LooseRisk;
  const values = new Set<string>();
  valuesFromUnknown(
    fieldValue(loose, 'componentIds'),
    ['id', 'componentId', 'componentUuid', 'uuid'],
    values,
  );
  valuesFromUnknown(
    fieldValue(loose, 'relatedComponents'),
    ['componentUuid', 'componentId', 'id', 'uuid'],
    values,
  );
  valuesFromUnknown(
    fieldValue(loose, 'components'),
    ['componentUuid', 'componentId', 'id', 'uuid'],
    values,
  );
  return Array.from(values);
}

function riskSearchText(risk: Risk): string {
  const owner = getRiskOwnerDisplay(risk);
  const parts = [
    risk.title,
    risk.description,
    risk.statement,
    risk.status,
    owner,
    getRiskLikelihood(risk),
    getRiskImpact(risk),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function compareNullableDate(
  left?: string,
  right?: string,
  direction: SortDirection = 'desc',
): number {
  const leftDate = toDateOrNull(left);
  const rightDate = toDateOrNull(right);
  const leftTs = leftDate ? leftDate.getTime() : 0;
  const rightTs = rightDate ? rightDate.getTime() : 0;
  return direction === 'asc' ? leftTs - rightTs : rightTs - leftTs;
}

function compareString(
  left: string,
  right: string,
  direction: SortDirection = 'asc',
): number {
  const result = left.localeCompare(right, undefined, { sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function normalizeLevel(level: string): number {
  switch (toLower(level)) {
    case 'low':
      return 1;
    case 'moderate':
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 0;
  }
}

function compareNumeric(
  left: number,
  right: number,
  direction: SortDirection = 'asc',
): number {
  return direction === 'asc' ? left - right : right - left;
}

export function computeRiskSummary(
  risks: Risk[] = [],
  now: Date = new Date(),
): RiskSummary {
  const nowTs = now.getTime();
  let open = 0;
  let accepted = 0;
  let overdueReviews = 0;

  risks.forEach((risk) => {
    if (isOpenStatus(risk.status)) open += 1;
    if (isAcceptedStatus(risk.status)) accepted += 1;

    const reviewDeadline = getRiskReviewDeadline(risk);
    const reviewDate = toDateOrNull(reviewDeadline);
    if (reviewDate && reviewDate.getTime() < nowTs) {
      overdueReviews += 1;
    }
  });

  return {
    total: risks.length,
    open,
    accepted,
    overdueReviews,
  };
}

export function filterRisks(
  risks: Risk[] = [],
  filters: RiskFilters = defaultRiskFilters,
  now: Date = new Date(),
): Risk[] {
  const search = toLower(filters.search);
  const status = toLower(filters.status);
  const likelihood = toLower(filters.likelihood);
  const impact = toLower(filters.impact);
  const owner = toLower(filters.owner);
  const controlId = toLower(filters.controlId);
  const evidenceId = toLower(filters.evidenceId);
  const nowTs = now.getTime();

  return risks.filter((risk) => {
    if (search && !riskSearchText(risk).includes(search)) {
      return false;
    }

    if (status !== 'all' && normalizeRiskStatus(risk.status) !== status) {
      return false;
    }

    if (likelihood !== 'all' && getRiskLikelihood(risk) !== likelihood) {
      return false;
    }

    if (impact !== 'all' && getRiskImpact(risk) !== impact) {
      return false;
    }

    if (owner && !getRiskOwnerDisplay(risk).toLowerCase().includes(owner)) {
      return false;
    }

    if (filters.review !== 'all') {
      const deadline = getRiskReviewDeadline(risk);
      const reviewDate = toDateOrNull(deadline);
      if (!reviewDate) return false;

      const isOverdue = reviewDate.getTime() < nowTs;
      if (filters.review === 'overdue' && !isOverdue) return false;
      if (filters.review === 'upcoming' && isOverdue) return false;
    }

    if (
      controlId &&
      !getRiskControlIds(risk).some((id) =>
        id.toLowerCase().includes(controlId),
      )
    ) {
      return false;
    }

    if (
      evidenceId &&
      !getRiskEvidenceIds(risk).some((id) =>
        id.toLowerCase().includes(evidenceId),
      )
    ) {
      return false;
    }

    return true;
  });
}

export function sortRisks(
  risks: Risk[] = [],
  sortBy: RiskSortBy = 'updated',
  direction: SortDirection = 'desc',
): Risk[] {
  return [...risks].sort((left, right) => {
    switch (sortBy) {
      case 'created':
        return compareNullableDate(
          getRiskCreatedAt(left),
          getRiskCreatedAt(right),
          direction,
        );
      case 'review-deadline':
        return compareNullableDate(
          getRiskReviewDeadline(left),
          getRiskReviewDeadline(right),
          direction,
        );
      case 'status':
        return compareString(
          normalizeRiskStatus(left.status),
          normalizeRiskStatus(right.status),
          direction,
        );
      case 'likelihood':
        return compareNumeric(
          normalizeLevel(getRiskLikelihood(left)),
          normalizeLevel(getRiskLikelihood(right)),
          direction,
        );
      case 'impact':
        return compareNumeric(
          normalizeLevel(getRiskImpact(left)),
          normalizeLevel(getRiskImpact(right)),
          direction,
        );
      case 'updated':
      default:
        return compareNullableDate(
          getRiskUpdatedAt(left) || getRiskCreatedAt(left),
          getRiskUpdatedAt(right) || getRiskCreatedAt(right),
          direction,
        );
    }
  });
}
