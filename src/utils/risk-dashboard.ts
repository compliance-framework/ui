import type { Risk } from '@/oscal';
import { getRiskIdentifier } from '@/utils/risk-id';
import {
  formatRiskFilterLevel,
  isAddressedStatus,
  isClosedStatus,
  getRiskCreatedAt,
  getRiskImpact,
  getRiskLikelihood,
  getRiskReviewDeadline,
  getRiskUpdatedAt,
  isOpenStatus,
  normalizeRiskStatus,
} from '@/utils/risk-register';

export const riskSeverityLevels = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

export type RiskSeverityLevel = (typeof riskSeverityLevels)[number];

export interface RiskStatusBreakdownItem {
  status: string;
  count: number;
  label: string;
}

export interface RiskHeatmapCell {
  likelihood: RiskSeverityLevel;
  impact: RiskSeverityLevel;
  count: number;
}

export interface OverdueRiskItem {
  id: string;
  title: string;
  reviewDeadline: string;
  status: string;
}

export interface TopRiskItem {
  id: string;
  title: string;
  impact: RiskSeverityLevel | 'unknown';
  likelihood: RiskSeverityLevel | 'unknown';
  updatedAt?: string;
}

export interface RiskAcceptanceMetrics {
  addressed: number;
  totalInScope: number;
  percentage: number;
}

export interface RiskTrendPoint {
  date: string;
  count: number;
  createdFrom: string;
  createdTo: string;
}

function titleize(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function riskLevel(level?: string): RiskSeverityLevel | null {
  const formatted = formatRiskFilterLevel(level);
  if (formatted === 'moderate') {
    return 'medium';
  }
  if (
    formatted === 'low' ||
    formatted === 'medium' ||
    formatted === 'high' ||
    formatted === 'critical'
  ) {
    return formatted;
  }
  return null;
}

function levelRank(level: RiskSeverityLevel | 'unknown' | null): number {
  switch (level) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    case 'unknown':
      return 0;
    default:
      return 0;
  }
}

function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function utcDayEnd(dayStart: Date): Date {
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function dayKey(dayStart: Date): string {
  return dayStart.toISOString().slice(0, 10);
}

export function formatRiskStatusLabel(status?: string): string {
  const normalized = normalizeRiskStatus(status) || 'unknown';
  return titleize(normalized);
}

export function buildRiskStatusBreakdown(
  risks: Risk[] = [],
): RiskStatusBreakdownItem[] {
  const counts = new Map<string, number>();

  for (const risk of risks) {
    if (isClosedStatus(risk.status)) continue;
    const status = normalizeRiskStatus(risk.status) || 'unknown';
    counts.set(status, (counts.get(status) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      count,
      label: formatRiskStatusLabel(status),
    }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    });
}

export function buildRiskSeverityHeatmap(risks: Risk[] = []): {
  cells: RiskHeatmapCell[];
  maxCount: number;
} {
  const counts = new Map<string, number>();

  for (const likelihood of riskSeverityLevels) {
    for (const impact of riskSeverityLevels) {
      counts.set(`${likelihood}:${impact}`, 0);
    }
  }

  for (const risk of risks) {
    const likelihood = riskLevel(getRiskLikelihood(risk));
    const impact = riskLevel(getRiskImpact(risk));
    if (!likelihood || !impact) continue;
    const key = `${likelihood}:${impact}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const cells: RiskHeatmapCell[] = [];
  let maxCount = 0;

  for (const likelihood of riskSeverityLevels) {
    for (const impact of riskSeverityLevels) {
      const count = counts.get(`${likelihood}:${impact}`) || 0;
      if (count > maxCount) maxCount = count;
      cells.push({ likelihood, impact, count });
    }
  }

  return { cells, maxCount };
}

export function listOverdueRisks(
  risks: Risk[] = [],
  now: Date = new Date(),
): OverdueRiskItem[] {
  const nowTs = now.getTime();

  return risks
    .map((risk) => {
      const id = getRiskIdentifier(risk);
      const reviewDeadline = getRiskReviewDeadline(risk);
      const parsed = parseDate(reviewDeadline);
      if (!id || !reviewDeadline || !parsed) return null;
      if (parsed.getTime() >= nowTs) return null;
      return {
        id,
        title: risk.title || 'Untitled Risk',
        reviewDeadline,
        status: normalizeRiskStatus(risk.status) || 'unknown',
      };
    })
    .filter((item): item is OverdueRiskItem => !!item)
    .sort((left, right) => {
      const leftDate = parseDate(left.reviewDeadline);
      const rightDate = parseDate(right.reviewDeadline);
      if (!leftDate || !rightDate) return 0;
      return leftDate.getTime() - rightDate.getTime();
    });
}

export function listTopOpenRisks(risks: Risk[] = [], limit = 5): TopRiskItem[] {
  const topRiskCandidates: TopRiskItem[] = [];

  for (const risk of risks) {
    if (!isOpenStatus(risk.status)) continue;
    const id = getRiskIdentifier(risk);
    const impact = riskLevel(getRiskImpact(risk)) || 'unknown';
    const likelihood = riskLevel(getRiskLikelihood(risk)) || 'unknown';
    if (!id) continue;
    topRiskCandidates.push({
      id,
      title: risk.title || 'Untitled Risk',
      impact,
      likelihood,
      updatedAt: getRiskUpdatedAt(risk) || getRiskCreatedAt(risk),
    });
  }

  return topRiskCandidates
    .sort((left, right) => {
      const impactDiff = levelRank(right.impact) - levelRank(left.impact);
      if (impactDiff !== 0) return impactDiff;

      const likelihoodDiff =
        levelRank(right.likelihood) - levelRank(left.likelihood);
      if (likelihoodDiff !== 0) return likelihoodDiff;

      const leftDate = parseDate(left.updatedAt);
      const rightDate = parseDate(right.updatedAt);
      if (!leftDate || !rightDate) return 0;
      return rightDate.getTime() - leftDate.getTime();
    })
    .slice(0, limit);
}

export function computeRiskAcceptanceMetrics(
  risks: Risk[] = [],
): RiskAcceptanceMetrics {
  const addressed = risks.filter((risk) =>
    isAddressedStatus(risk.status),
  ).length;
  const totalInScope = risks.filter((risk) => {
    const normalized = normalizeRiskStatus(risk.status);
    return (
      isAddressedStatus(risk.status) ||
      normalized === 'mitigation-planned' ||
      normalized === 'mitigating-planned' ||
      normalized === 'investigating' ||
      normalized === 'open'
    );
  }).length;
  const percentage =
    totalInScope === 0 ? 0 : Math.round((addressed / totalInScope) * 1000) / 10;

  return {
    addressed,
    totalInScope,
    percentage,
  };
}

export function buildRiskTrend(
  risks: Risk[] = [],
  rangeDays: 30 | 60 | 90,
  now: Date = new Date(),
): RiskTrendPoint[] {
  const dayCounts = new Map<string, number>();
  const endDayStart = utcDayStart(now);
  const rangeStart = new Date(endDayStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - rangeDays + 1);

  for (let dayOffset = 0; dayOffset < rangeDays; dayOffset += 1) {
    const dayStart = new Date(rangeStart);
    dayStart.setUTCDate(rangeStart.getUTCDate() + dayOffset);
    dayCounts.set(dayKey(dayStart), 0);
  }

  for (const risk of risks) {
    const created = parseDate(getRiskCreatedAt(risk));
    if (!created) continue;
    const key = dayKey(utcDayStart(created));
    if (!dayCounts.has(key)) continue;
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }

  return Array.from(dayCounts.entries()).map(([date, count]) => {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = utcDayEnd(dayStart);
    return {
      date,
      count,
      createdFrom: dayStart.toISOString(),
      createdTo: dayEnd.toISOString(),
    };
  });
}
