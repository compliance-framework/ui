// Type-aware helpers for rendering lineage nodes. Structural nodes (catalogs,
// groups, controls, policies, procedures) carry compliance + aggregate risk; the
// new `risk` and `evidence` leaf types carry their own fields. These helpers keep
// the heat/ordering/badge logic in one place so the row, card, graph and drawer
// all agree. Everything is defensive — fields may be absent on older API builds.

import {
  heatStyle,
  CLEAR_STYLE,
  ACCEPTED_STYLE,
  type HeatStyle,
} from './heatScale';
import type {
  LineageNode,
  LineageLeverageSummary,
} from '@/composables/useLineage/types';

export type LineageKind = 'structural' | 'risk' | 'evidence';

// Risk statuses that mean the risk is no longer live — accepted, mitigated, or
// closed. Such risks don't add to a node's heat, and a risk *node* with one of
// these statuses is rendered grayed-out (neutral) regardless of its raw score.
const MUTED_RISK_STATUSES = new Set([
  'mitigating-planned',
  'mitigating_planned',
  'mitigating-implemented',
  'mitigating_implemented',
  'risk-accepted',
  'accepted',
  'remediated',
  'resolved',
  'closed',
]);

/** True when a risk's status means it's accepted/mitigated/closed (not live). */
export function isRiskMuted(status?: string): boolean {
  return MUTED_RISK_STATUSES.has((status ?? '').toLowerCase());
}

/**
 * A structural node counts as "implemented" when its compliance is fully
 * satisfied — every assessed control satisfied, nothing not-satisfied or unknown.
 * Mirrors the `fullyCompliant` rule used by the compliance pill.
 */
export function isImplemented(node: LineageNode): boolean {
  const c = node.compliance;
  return c.totalControls > 0 && c.notSatisfied === 0 && c.unknown === 0;
}

/**
 * Colour bundle for a STRUCTURAL node (catalog/group/control/policy/procedure),
 * combining open-risk heat with compliance + accepted-risk state:
 *   - open risk (`openScoreSum > 0`)      → flame heat, as before
 *   - only accepted/mitigated risk remains → blue "accepted" (never green)
 *   - implemented with no risk at all      → green "clear" (like passing evidence)
 *   - otherwise                            → neutral
 */
export function structuralStyle(node: LineageNode): HeatStyle {
  const open = node.risk?.openScoreSum ?? 0;
  if (open > 0) return heatStyle(open);
  const muted = node.risk?.mutedScoreSum ?? 0;
  if (muted > 0) return ACCEPTED_STYLE;
  if (isImplemented(node)) return CLEAR_STYLE;
  return heatStyle(0); // neutral
}

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
const PURPLE =
  'bg-purple-100 text-purple-700 dark:bg-purple-500/25 dark:text-purple-200';

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

// --- SSP posture (single-SSP overlay) --------------------------------------
//
// When an SSP is selected, operational control nodes carry `ssp.posture`. The
// posture decides whether the node is flagged (attention → warning icon),
// silently excused (not-applicable / planned → neutral chip, NO warning),
// dimmed (out-of-scope → not part of the profile) or already conveyed by the
// compliance pill (satisfied / not-satisfied). Colours match the controls page.

const GRAY_BADGE =
  'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-200';

const POSTURE_LABELS: Record<string, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  planned: 'Planned',
  alternative: 'Alternative',
  'not-applicable': 'Not Applicable',
};

/** Human label for a declared implementation status ('' → undefined). */
export function implStatusLabel(state?: string): string | undefined {
  const s = state?.trim().toLowerCase();
  if (!s) return undefined;
  return POSTURE_LABELS[s] ?? state;
}

const POSTURE_BADGES: Record<string, Badge> = {
  satisfied: { label: 'Satisfied', class: EMERALD },
  'not-satisfied': { label: 'Not satisfied', class: RED },
  inherited: { label: 'Inherited', class: PURPLE },
  attention: { label: 'Needs evidence', class: AMBER },
  'not-applicable': { label: 'Not applicable', class: GRAY_BADGE },
  planned: { label: 'Planned', class: SKY },
  'out-of-scope': { label: 'Out of scope', class: SLATE },
};

/** Coloured badge for a posture value (drawer per-SSP table). */
export function postureBadge(posture?: string): Badge {
  return (
    POSTURE_BADGES[posture ?? ''] ?? { label: posture ?? '—', class: SLATE }
  );
}

/**
 * Non-credit leverage badge for a control's single-SSP overlay. Rendered when the
 * control has ≥1 leverage link but its posture is NOT `inherited` — drifted/partial
 * links get no posture credit yet still deserve an "Inherited · drifted" marker.
 * Returns null when there is no leverage to surface.
 */
export function leverageBadge(lev?: LineageLeverageSummary): Badge | null {
  if (!lev || lev.links === 0) return null;
  if (lev.status === 'drifted')
    return { label: 'Inherited · drifted', class: AMBER };
  if (lev.status === 'revoked')
    return { label: 'Inherited · revoked', class: SLATE };
  if (lev.status === 'superseded')
    return { label: 'Inherited · superseded', class: SLATE };
  return { label: 'Inherited', class: PURPLE };
}

export interface PostureDisplay {
  /** Chip label; empty when the compliance pill already conveys the state. */
  label: string;
  badgeClass: string;
  /** Amber warning icon (the exclamation) — only for `attention`. */
  showWarning: boolean;
  /** Dim the whole row — only for `out-of-scope`. */
  dim: boolean;
  tooltip: string;
}

/**
 * Display treatment for an operational control's posture in the selected SSP.
 * Returns null when the node carries no SSP overlay (global view, or a
 * policy/procedure/structural node).
 */
export function postureDisplay(node: LineageNode): PostureDisplay | null {
  const ssp = node.ssp;
  if (!ssp) return null;
  switch (ssp.posture) {
    case 'out-of-scope':
      return {
        label: 'Not in profile',
        badgeClass: SLATE,
        showWarning: false,
        dim: true,
        tooltip: 'Not part of the selected SSP’s profile',
      };
    case 'not-applicable':
      return {
        label: 'Not Applicable',
        badgeClass: GRAY_BADGE,
        showWarning: false,
        dim: false,
        tooltip: 'Marked not-applicable in this SSP — no evidence expected',
      };
    case 'planned':
      return {
        label: 'Planned',
        badgeClass: SKY,
        showWarning: false,
        dim: false,
        tooltip: 'Planned in this SSP — no evidence expected yet',
      };
    case 'inherited': {
      const lev = ssp.leverage;
      return {
        label: 'Inherited',
        badgeClass: PURPLE,
        showWarning: false,
        dim: false,
        tooltip: lev
          ? `Inherited from upstream — ${lev.links} link(s), ${lev.outstandingCount}/${lev.totalResponsibilities} responsibilities outstanding`
          : 'Fully inherited from an upstream SSP',
      };
    }
    case 'attention': {
      const declared = ssp.implementationStatus
        ? `declared “${POSTURE_LABELS[ssp.implementationStatus] ?? ssp.implementationStatus}”`
        : 'no implementation status';
      return {
        label: 'Needs evidence',
        badgeClass: AMBER,
        showWarning: true,
        dim: false,
        tooltip: `In the profile with no evidence and ${declared}`,
      };
    }
    // satisfied / not-satisfied are already shown by the compliance pill.
    default:
      return null;
  }
}

// --- Posture distribution bar ----------------------------------------------
//
// The same six posture buckets, as a stacked bar. Two nodes carry a distribution:
// a structural node's `postureCounts` (its controls, in the selected SSP) and a
// control's `sspBreakdown` (across all SSPs, global view). One bar renders both.

export interface PostureSegment {
  key: string;
  label: string;
  count: number;
  class: string;
}

const POSTURE_SEGMENT_DEFS: { key: string; label: string; class: string }[] = [
  { key: 'satisfied', label: 'satisfied', class: 'bg-emerald-500' },
  { key: 'inherited', label: 'inherited', class: 'bg-purple-500' },
  { key: 'attention', label: 'need evidence', class: 'bg-amber-500' },
  { key: 'notSatisfied', label: 'not satisfied', class: 'bg-red-500' },
  {
    key: 'notApplicable',
    label: 'not applicable',
    class: 'bg-gray-400 dark:bg-slate-500',
  },
  { key: 'planned', label: 'planned', class: 'bg-sky-500' },
  {
    key: 'outOfScope',
    label: 'out of scope',
    class: 'bg-slate-300 dark:bg-slate-600',
  },
];

/** Non-empty posture segments in fixed order, for the stacked bar. */
export function postureSegments(
  counts: Record<string, number>,
): PostureSegment[] {
  return POSTURE_SEGMENT_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    class: d.class,
    count: counts[d.key] ?? 0,
  })).filter((s) => s.count > 0);
}

export interface PostureDistribution {
  segments: PostureSegment[];
  total: number;
  /** Short caption, e.g. "8/12 SSPs" or "42 controls". */
  caption: string;
  attention: number;
}

/**
 * The posture distribution a node carries, if any: a control's cross-SSP
 * breakdown (global view) or a structural node's control tally (selected SSP).
 * Null when the node has neither or the distribution is empty.
 */
export function postureDistribution(
  node: LineageNode,
): PostureDistribution | null {
  if (node.sspBreakdown && node.sspBreakdown.totalSsps > 0) {
    const b = node.sspBreakdown;
    // Buckets are (control × SSP) cells: every leaf control beneath the node
    // contributes one posture per SSP, so the bar spans the full cell count and
    // total = controls × ssps.
    const total =
      b.satisfied +
      (b.inherited ?? 0) +
      b.notSatisfied +
      b.notApplicable +
      b.planned +
      b.attention +
      b.outOfScope;
    if (total === 0) return null;
    const controls = Math.round(total / b.totalSsps);
    const caption =
      controls > 1
        ? `${controls} controls · ${b.totalSsps} SSPs`
        : `${b.totalSsps - b.outOfScope}/${b.totalSsps} SSPs`;
    return {
      segments: postureSegments(b as unknown as Record<string, number>),
      total,
      caption,
      attention: b.attention,
    };
  }
  if (node.postureCounts) {
    const c = node.postureCounts;
    const total =
      c.satisfied +
      (c.inherited ?? 0) +
      c.notSatisfied +
      c.notApplicable +
      c.planned +
      c.attention +
      c.outOfScope;
    if (total === 0) return null;
    return {
      segments: postureSegments(c as unknown as Record<string, number>),
      total,
      caption: `${total} controls`,
      attention: c.attention,
    };
  }
  return null;
}

/** Solid swatch colour for a node (state for evidence, else heat). */
export function nodeSwatchClass(node: LineageNode): string {
  if (node.nodeType === 'evidence') {
    const b = evidenceBadness(node.status);
    if (b >= 100) return 'bg-red-600';
    if (b === 0) return 'bg-emerald-500';
    return 'bg-slate-300 dark:bg-slate-600';
  }
  if (node.nodeType === 'risk') {
    // A remediated/accepted risk is grayed out — never green/orange/red.
    if (isRiskMuted(node.status)) return heatStyle(0).swatchClass;
    return heatStyle(nodeHeatScore(node)).swatchClass;
  }
  return structuralStyle(node).swatchClass;
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
  if (node.nodeType === 'risk') {
    // A remediated/accepted risk is grayed out — never green/orange/red.
    if (isRiskMuted(node.status)) return heatStyle(0).nodeClass;
    return heatStyle(nodeHeatScore(node)).nodeClass;
  }
  return structuralStyle(node).nodeClass;
}

/** The id encoded in a composite key, e.g. "risk:<uuid>" -> "<uuid>". */
function idFromKey(key: string): string {
  const i = key.indexOf(':');
  return i >= 0 ? key.slice(i + 1) : key;
}

/**
 * Router target for a node's own detail page — risk and evidence nodes link to
 * their existing DetailViews; structural nodes have none (open the drawer instead).
 */
export function nodeDetailRoute(
  node: LineageNode,
  sspId?: string | null,
): { name: string; params: Record<string, string> } | null {
  if (node.nodeType === 'risk') {
    const riskId = node.riskId || idFromKey(node.key);
    if (!riskId) return null;
    // Prefer the risk's own SSP: a lineage view scoped to one SSP can still
    // render cross-SSP risks, so routing by the active scope would open the
    // wrong SSP's context. Fall back to the active scope, then to the unscoped
    // detail route when neither is known.
    const targetSspId = node.sspId || sspId;
    return targetSspId
      ? {
          name: 'system-security-plan-risk-detail',
          params: { id: targetSspId, riskId },
        }
      : { name: 'risks:detail', params: { riskId } };
  }
  if (node.nodeType === 'evidence') {
    // The evidence key holds the *stream* uuid, not the record id — only
    // evidenceId links to GET /evidence/{id}, so never fall back to the key.
    return node.evidenceId
      ? { name: 'evidence:view', params: { id: node.evidenceId } }
      : null;
  }
  return null;
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
