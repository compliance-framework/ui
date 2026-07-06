// Type-aware helpers for rendering lineage nodes. Structural nodes (catalogs,
// groups, controls, policies, procedures) carry compliance + aggregate risk; the
// new `risk` and `evidence` leaf types carry their own fields. These helpers keep
// the heat/ordering/badge logic in one place so the row, card, graph and drawer
// all agree. Everything is defensive — fields may be absent on older API builds.

import { heatStyle } from './heatScale';
import type { LineageNode } from '@/composables/useLineage/types';

export type LineageKind = 'structural' | 'risk' | 'evidence';

export function nodeKind(node: LineageNode): LineageKind {
  if (node.nodeType === 'risk') return 'risk';
  if (node.nodeType === 'evidence') return 'evidence';
  return 'structural';
}

/** Heat score for a node's swatch/tint, regardless of type. */
export function nodeHeatScore(node: LineageNode): number {
  if (node.nodeType === 'risk')
    return node.score ?? node.risk?.openScoreSum ?? 0;
  return node.risk?.openScoreSum ?? 0;
}

/** How "bad" an evidence state is (higher = worse) for ordering + colour. */
export function evidenceBadness(status?: string): number {
  const s = (status ?? '').toLowerCase();
  if (
    s.includes('not') ||
    s === 'failed' ||
    s === 'unsatisfied' ||
    s === 'noncompliant'
  )
    return 100;
  if (s === 'satisfied' || s === 'compliant' || s === 'passed' || s === 'pass')
    return 0;
  return 50; // unknown / pending / undetermined / empty
}

/** Ordering weight for "worst first", per node type. */
export function nodeRankScore(node: LineageNode): number {
  if (node.nodeType === 'evidence') return evidenceBadness(node.status);
  if (node.nodeType === 'risk')
    return node.score ?? node.risk?.openScoreSum ?? 0;
  return node.risk?.openScoreSum ?? 0;
}

export interface Badge {
  label: string;
  class: string;
}

const RED = 'bg-red-100 text-red-700 dark:bg-red-500/25 dark:text-red-200';
const ORANGE =
  'bg-orange-100 text-orange-700 dark:bg-orange-500/25 dark:text-orange-200';
const AMBER =
  'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200';
const YELLOW =
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-200';
const EMERALD =
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200';
const SLATE =
  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
const SKY = 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200';

/** Coloured badge for an evidence state. */
export function evidenceStateBadge(status?: string): Badge {
  const label = status || 'unknown';
  const b = evidenceBadness(status);
  if (b >= 100) return { label, class: RED };
  if (b === 0) return { label, class: EMERALD };
  return { label, class: SLATE };
}

/** Coloured badge for a risk status. */
export function riskStatusBadge(status?: string): Badge {
  const label = status || 'unknown';
  switch ((status ?? '').toLowerCase()) {
    case 'open':
      return { label, class: RED };
    case 'investigating':
      return { label, class: AMBER };
    case 'mitigating-planned':
    case 'mitigating_planned':
      return { label, class: SKY };
    case 'mitigating-implemented':
    case 'mitigating_implemented':
    case 'risk-accepted':
    case 'accepted':
    case 'closed':
      return { label, class: SLATE };
    default:
      return { label, class: SLATE };
  }
}

// Fallback severity from a score when the API doesn't send `severity`.
function severityFromScore(score?: number): string | undefined {
  if (score == null) return undefined;
  if (score >= 50) return 'critical';
  if (score >= 25) return 'high';
  if (score >= 10) return 'moderate';
  if (score >= 1) return 'low';
  return 'info';
}

/** Coloured severity badge for a risk (uses `severity`, else derives from score). */
export function severityBadge(node: LineageNode): Badge | null {
  const sev = (node.severity ?? severityFromScore(node.score))?.toLowerCase();
  if (!sev) return null;
  const label = node.severity ?? sev;
  switch (sev) {
    case 'critical':
      return { label, class: RED };
    case 'high':
      return { label, class: ORANGE };
    case 'moderate':
    case 'medium':
      return { label, class: AMBER };
    case 'low':
      return { label, class: YELLOW };
    default:
      return { label, class: SLATE };
  }
}

/** Solid swatch colour for a node (state for evidence, else heat). */
export function nodeSwatchClass(node: LineageNode): string {
  if (node.nodeType === 'evidence') {
    const b = evidenceBadness(node.status);
    if (b >= 100) return 'bg-red-600';
    if (b === 0) return 'bg-emerald-500';
    return 'bg-slate-300 dark:bg-slate-600';
  }
  return heatStyle(nodeHeatScore(node)).swatchClass;
}

/** Card tint + accent border for a node (state for evidence, else heat). */
export function nodeCardClass(node: LineageNode): string {
  if (node.nodeType === 'evidence') {
    const b = evidenceBadness(node.status);
    if (b >= 100)
      return 'bg-red-50 border-red-500 dark:bg-red-950/40 dark:border-red-600';
    if (b === 0)
      return 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-500';
    return 'bg-slate-50 border-slate-300 dark:bg-slate-800 dark:border-slate-600';
  }
  return heatStyle(nodeHeatScore(node)).nodeClass;
}

/** Short, safe date formatting (returns null for missing/invalid input). */
export function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
