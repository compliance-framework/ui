import type { ByComponent } from '@/oscal';

export const implementationStatusOptions = [
  { label: 'Implemented', value: 'implemented' },
  { label: 'Partial', value: 'partial' },
  { label: 'Planned', value: 'planned' },
  { label: 'Alternative', value: 'alternative' },
  { label: 'Not Applicable', value: 'not-applicable' },
] as const;

export type ImplementationStatusState =
  (typeof implementationStatusOptions)[number]['value'];

export interface ImplementationStatusCue {
  label: string;
  countClass: string;
  panelClass: string;
}

export const implementationStatusCues: Record<
  ImplementationStatusState,
  ImplementationStatusCue
> = {
  implemented: {
    label: 'Implemented',
    countClass: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950',
    panelClass:
      'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20',
  },
  partial: {
    label: 'Partial',
    countClass: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950',
    panelClass:
      'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
  },
  planned: {
    label: 'Planned',
    countClass: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950',
    panelClass:
      'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20',
  },
  alternative: {
    label: 'Alternative',
    countClass:
      'bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950',
    panelClass:
      'border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20',
  },
  'not-applicable': {
    label: 'Not Applicable',
    countClass: 'bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-950',
    panelClass:
      'border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-800/70',
  },
};

export function implementationStatusLabel(state?: string): string | undefined {
  if (!state) return undefined;
  const normalizedState = state.trim().toLowerCase();
  return (
    implementationStatusOptions.find(
      (option) => option.value === normalizedState,
    )?.label ?? state
  );
}

export function uniformImplementationStatusCue(
  byComponents: ByComponent[] | undefined,
): ImplementationStatusCue | null {
  if (!byComponents?.length) {
    return null;
  }

  const states = byComponents.map((byComponent) =>
    byComponent.implementationStatus?.state?.trim().toLowerCase(),
  );
  const firstState = states[0];
  if (!firstState || !states.every((state) => state === firstState)) {
    return null;
  }

  return (
    implementationStatusCues[firstState as ImplementationStatusState] ?? null
  );
}

export function normalizeByComponentImplementationStatus<T extends ByComponent>(
  byComponent: T,
): T {
  const state = byComponent.implementationStatus?.state;
  if (typeof state !== 'string') {
    const normalized = { ...byComponent };
    delete normalized.implementationStatus;
    return normalized;
  }

  const trimmedState = state.trim();
  if (!trimmedState) {
    const normalized = { ...byComponent };
    delete normalized.implementationStatus;
    return normalized;
  }

  const canonicalState =
    implementationStatusOptions.find(
      (option) => option.value === trimmedState.toLowerCase(),
    )?.value ?? trimmedState;

  if (canonicalState === state) {
    return byComponent;
  }

  return {
    ...byComponent,
    implementationStatus: {
      ...byComponent.implementationStatus,
      state: canonicalState,
    },
  };
}
