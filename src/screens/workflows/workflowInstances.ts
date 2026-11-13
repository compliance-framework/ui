import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import type { CadenceType, WorkflowDefinition } from '@/types/workflows';
import { validateCronExpression } from '@/utils/cron';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
} from '@/utils/workflows';

/**
 * Workflow instances for This System: the list's URL state, cadence wording, and the New
 * instance form's model and rules (ported from the classic create form).
 */
export interface InstancesView {
  definition: string;
  status: 'active' | 'inactive' | '';
  /** A name search, applied in the browser. */
  q: string;
}

function single(value: LocationQuery[string] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readView(query: LocationQuery): InstancesView {
  const status = single(query.status);
  return {
    definition: single(query.definition),
    status: status === 'active' || status === 'inactive' ? status : '',
    q: single(query.q).trim(),
  };
}

export function viewQuery(view: InstancesView): LocationQueryRaw {
  const query: LocationQueryRaw = {};
  if (view.definition) query.definition = view.definition;
  if (view.status) query.status = view.status;
  if (view.q) query.q = view.q;
  return query;
}

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  on_demand: 'On demand',
};

export function cadenceLabel(cadence: CadenceType): string {
  if (cadence.startsWith('cron:')) return `Custom (${cadence.slice(5)})`;
  return CADENCE_LABELS[cadence] ?? cadence;
}

export const CADENCE_OPTIONS = [
  ...Object.entries(CADENCE_LABELS).map(([value, label]) => ({ value, label })),
  { value: 'custom', label: 'Custom (cron)' },
];

// New instance ---------------------------------------------------------------------------------

export interface InstanceDraft {
  definitionId: string;
  name: string;
  description: string;
  /** A preset cadence, or 'custom' with `cron`. */
  cadence: string;
  cron: string;
  gracePeriod: string;
  /** The grace period the form last defaulted to, to tell a default from a user's choice. */
  gracePeriodDefault: number;
}

export function newDraft(definitionId = ''): InstanceDraft {
  return {
    definitionId,
    name: '',
    description: '',
    cadence: 'monthly',
    cron: '',
    gracePeriod: String(DEFAULT_GRACE_PERIOD_DAYS),
    gracePeriodDefault: DEFAULT_GRACE_PERIOD_DAYS,
  };
}

/**
 * Choosing a definition suggests a name (if none yet), its suggested cadence, and its grace
 * period, unless the user has already changed the grace period from the previous default.
 */
export function applyDefinition(
  draft: InstanceDraft,
  definition: WorkflowDefinition | undefined,
): InstanceDraft {
  if (!definition) return draft;
  const next = { ...draft };
  if (!next.name) next.name = `${definition.name} Instance`;
  const suggested = definition.suggestedCadence;
  if (suggested) {
    if (suggested.startsWith('cron:')) {
      next.cadence = 'custom';
      next.cron = suggested.slice(5);
    } else {
      next.cadence = suggested;
      next.cron = '';
    }
  }
  const nextDefault = definition.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  const current = parseGracePeriodInput(next.gracePeriod);
  if (!current.error && current.value === next.gracePeriodDefault) {
    next.gracePeriod = String(nextDefault);
  }
  next.gracePeriodDefault = nextDefault;
  return next;
}

export function validateDraft(
  draft: InstanceDraft,
): Partial<Record<'definition' | 'name' | 'cron' | 'gracePeriod', string>> {
  const errors: ReturnType<typeof validateDraft> = {};
  if (!draft.definitionId) errors.definition = 'Choose a workflow definition.';
  if (!draft.name.trim()) errors.name = 'Enter a name.';
  if (draft.cadence === 'custom') {
    const cron = draft.cron.trim();
    errors.cron = cron
      ? (validateCronExpression(cron) ?? undefined)
      : 'Enter a cron expression.';
    if (!errors.cron) delete errors.cron;
  }
  const grace = parseGracePeriodInput(draft.gracePeriod);
  if (grace.error) errors.gracePeriod = grace.error;
  return errors;
}

/** The POST /api/workflows/instances body (before kebab-casing), as the classic form sent it. */
export function instancePayload(draft: InstanceDraft, systemId: string) {
  const grace = parseGracePeriodInput(draft.gracePeriod);
  return {
    workflowDefinitionId: draft.definitionId,
    name: draft.name.trim(),
    description: draft.description,
    cadence: (draft.cadence === 'custom'
      ? `cron:${draft.cron.trim()}`
      : draft.cadence) as CadenceType,
    systemId,
    ...(grace.value != null ? { gracePeriodDays: grace.value } : {}),
  };
}
