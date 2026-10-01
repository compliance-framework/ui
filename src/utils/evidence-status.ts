// Pill colours for evidence status (satisfied / not-satisfied / in-progress), shared by the
// evidence detail page and its tabs.
export enum FindingStatusColor {
  UNKNOWN = 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  SATISFIED = 'bg-green-50 text-green-800 border-green-800 dark:bg-green-950/30 dark:text-green-500 dark:border-green-600',
  'NOT-SATISFIED' = 'bg-red-50 text-red-800 border-red-800 dark:bg-red-950/30 dark:text-red-500 dark:border-red-600',
  'IN-PROGRESS' = 'bg-amber-50 text-amber-800 border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700',
}

export function getEvidenceStatusColor(status?: string): string {
  return (
    FindingStatusColor[
      status?.toUpperCase() as keyof typeof FindingStatusColor
    ] || FindingStatusColor.UNKNOWN
  );
}
