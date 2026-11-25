import type {
  ByComponent,
  Control,
  ImplementedRequirement,
  Statement,
  Property,
} from '@/oscal';
import { CCF_OSCAL_NAMESPACE } from '@/types/subjects';
import {
  insertParams,
  partOutline,
  type PartOutlineItem,
} from '@/utils/oscal-parts';
import {
  statuses,
  type StatusKey,
  type StatusTone,
} from '@/ds/components/StatusBadge/statuses';

/** One part of a control's statement ("a. Define and document…") and what implements it. */
export interface PartBand {
  /** The part's ID, which the statement implementing it uses as its statement ID. */
  id: string;
  /** The part's own label and text ("1. Authorized users…"), with parameters, without its sub-parts. */
  text: string;
  /** The part's label alone ("1."), and its text alone, with parameters. */
  label: string;
  prose: string;
  /** How deep the part is: 0 for a., 1 for a.1, 2 for a.1.(a). */
  depth: number;
  statement?: Statement;
  /** False when the plan marks the part as needing no implementation statement of its own. */
  required: boolean;
}

/** A control's implementation laid against its statement, part by part. */
export interface PartMap {
  /** The statement's lead-in before its parts ("The organization:"), if any. */
  lead: string;
  /** Components that implement the whole control rather than one part. */
  whole: ByComponent[];
  /** One per part, at every depth, in reading order; a control without parts has one, its whole statement. */
  bands: PartBand[];
  /** Statements whose ID matches no part of the control. */
  others: Statement[];
}

const same = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** Each part of the control's statement, with the implementation's statement for it. */
export function partMap(
  control: Control,
  implementation: ImplementedRequirement | undefined,
): PartMap {
  const statementPart = control.parts?.find((p) => p.name === 'statement');
  const statements = implementation?.statements ?? [];
  const text = (s: string) => insertParams(s, control.params);
  const outline = statementPart ? partOutline(statementPart) : [];
  const flatten = (
    items: PartOutlineItem[],
    depth: number,
  ): Omit<PartBand, 'statement' | 'required'>[] =>
    items.flatMap((item) => [
      {
        id: item.id,
        text: text(`${item.label} ${item.text}`.trim()),
        label: item.label,
        prose: text(item.text),
        depth,
      },
      ...flatten(item.items, depth + 1),
    ]);
  const parts = outline.length
    ? flatten(outline, 0)
    : [
        {
          id: statementPart?.id ?? `${control.id}_smt`,
          text: text(statementPart?.prose ?? ''),
          label: '',
          prose: text(statementPart?.prose ?? ''),
          depth: 0,
        },
      ];
  const bands = parts.map((part) => {
    const statement = statements.find((s) => same(s.statementId, part.id));
    return { ...part, statement, required: implementationRequired(statement) };
  });
  return {
    lead: outline.length ? text(statementPart?.prose ?? '') : '',
    whole: implementation?.byComponents ?? [],
    bands,
    others: statements.filter(
      (s) => !bands.some((band) => same(band.id, s.statementId)),
    ),
  };
}

/**
 * The plan's mark that a part needs no implementation statement of its own, e.g. a lead-in such as
 * ac-2 h ("Notify account managers…:") whose sub-parts are what get implemented. A CCF property on
 * the part's statement in the SSP; without it, every part needs one.
 */
const NOT_REQUIRED: Property = {
  ns: CCF_OSCAL_NAMESPACE,
  name: 'implementation-required',
  value: 'false',
};
const isNotRequired = (p: Property) =>
  p.ns === NOT_REQUIRED.ns && p.name === NOT_REQUIRED.name;

export function implementationRequired(statement?: Statement): boolean {
  return !statement?.props?.some(
    (p) => isNotRequired(p) && p.value?.trim().toLowerCase() === 'false',
  );
}

/** A statement's properties with the mark set as `required` says, its other properties kept. */
export function withImplementationRequired(
  props: Property[] | undefined,
  required: boolean,
): Property[] {
  const others = (props ?? []).filter((p) => !isNotRequired(p));
  return required ? others : [...others, { ...NOT_REQUIRED }];
}

/** The badge for a component's implementation status, if it has a known one. */
export function implementationStatus(bc: ByComponent): StatusKey | undefined {
  const state = bc.implementationStatus?.state?.trim().toLowerCase();
  return state && state in statuses ? (state as StatusKey) : undefined;
}

const STATUS_ORDER: StatusKey[] = [
  'implemented',
  'partial',
  'planned',
  'alternative',
  'not-applicable',
];

/** What a list row says about an implementation, without its text. */
export interface ImplementationSummary {
  /**
   * The statements that need an implementation (each part, leaving out parts marked as needing
   * none; a control without parts is one statement), and how many of them a component implements.
   * Whole-control components count for a control without parts only.
   */
  statements: number;
  implemented: number;
  /**
   * How many component implementations have each status, in the order work progresses, those
   * without a status last; statuses no implementation has are left out.
   */
  statusCounts: { status: StatusKey; count: number }[];
}

export function implementationSummary(map: PartMap): ImplementationSummary {
  const required = map.bands.filter((b) => b.required);
  const all = [
    ...map.whole,
    ...required.flatMap((b) => b.statement?.byComponents ?? []),
    ...map.others.flatMap((s) => s.byComponents ?? []),
  ];
  const counts = new Map<StatusKey, number>();
  for (const bc of all) {
    const status = implementationStatus(bc) ?? 'no-status';
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  // A control without parts has one band, its whole statement, which its whole-control
  // components implement.
  const single = map.bands.length === 1 && !map.bands[0]!.label;
  return {
    statements: required.length,
    implemented: required.filter(
      (b) => b.statement?.byComponents?.length || (single && map.whole.length),
    ).length,
    statusCounts: [...STATUS_ORDER, 'no-status' as StatusKey]
      .filter((status) => counts.has(status))
      .map((status) => ({ status, count: counts.get(status)! })),
  };
}

/** An implementation status's pill colour: green when implemented, amber when partial, else blue. */
export function implementationTone(status: StatusKey): StatusTone {
  if (status === 'implemented') return 'success';
  if (status === 'partial') return 'warning';
  return 'info';
}
