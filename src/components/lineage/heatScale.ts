// Single source of truth for the flame-graph heat colouring used by both the tree
// and the graph views. Colour is driven by the ABSOLUTE sum of *open* risk scores
// on a node (`risk.openScoreSum`) — NOT normalised to the max in view — so the same
// score always yields the same colour regardless of which nodes are on screen.
//
// Buckets (from the PoC spec):
//   openScoreSum | 0       | 1–9    | 10–24 | 25–49  | ≥50
//   colour       | neutral | yellow | amber | orange | red
//
// Every class string below is a complete literal so Tailwind's JIT scanner picks it
// up — do NOT build these by concatenation. Heat classes carry `dark:` variants so
// the colours survive dark mode (acceptance criterion 6).

export type HeatBucket = 'neutral' | 'yellow' | 'amber' | 'orange' | 'red';

export interface HeatStyle {
  bucket: HeatBucket;
  /** Human label for tooltips / legends. */
  label: string;
  /** Solid heat dot / square (the flame swatch). */
  swatchClass: string;
  /** Tinted pill background + text for the risk badge. */
  badgeClass: string;
  /** Subtle heat tint + accent border for a whole graph node card. */
  nodeClass: string;
}

const STYLES: Record<HeatBucket, Omit<HeatStyle, 'bucket'>> = {
  neutral: {
    label: 'No open risk',
    swatchClass: 'bg-slate-300 dark:bg-slate-600',
    badgeClass:
      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
    nodeClass:
      'bg-slate-50 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
  },
  yellow: {
    label: 'Low',
    swatchClass: 'bg-yellow-400 dark:bg-yellow-400',
    badgeClass:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-200',
    nodeClass:
      'bg-yellow-50 border-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-500',
  },
  amber: {
    label: 'Moderate',
    swatchClass: 'bg-amber-500 dark:bg-amber-500',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200',
    nodeClass:
      'bg-amber-50 border-amber-500 dark:bg-amber-950/40 dark:border-amber-500',
  },
  orange: {
    label: 'High',
    swatchClass: 'bg-orange-500 dark:bg-orange-500',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-200',
    nodeClass:
      'bg-orange-50 border-orange-500 dark:bg-orange-950/40 dark:border-orange-500',
  },
  red: {
    label: 'Critical',
    swatchClass: 'bg-red-600 dark:bg-red-600',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-500/30 dark:text-red-200',
    nodeClass:
      'bg-red-50 border-red-600 dark:bg-red-950/40 dark:border-red-600',
  },
};

/**
 * Map an open-risk-score sum to its heat bucket using absolute boundaries.
 * Non-finite or negative input is clamped to `neutral`.
 */
export function heatBucket(openScoreSum: number): HeatBucket {
  if (!Number.isFinite(openScoreSum) || openScoreSum <= 0) return 'neutral';
  if (openScoreSum <= 9) return 'yellow';
  if (openScoreSum <= 24) return 'amber';
  if (openScoreSum <= 49) return 'orange';
  return 'red';
}

/** Full style bundle (classes + label) for a given open-risk-score sum. */
export function heatStyle(openScoreSum: number): HeatStyle {
  const bucket = heatBucket(openScoreSum);
  return { bucket, ...STYLES[bucket] };
}
