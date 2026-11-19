import type {
  ByComponent,
  Control,
  ImplementedRequirement,
  Statement,
} from '@/oscal';
import { insertParams, partMarkdown } from '@/utils/oscal-parts';
import { statuses, type StatusKey } from '@/ds/components/StatusBadge/statuses';

/** One part of a control's statement ("a. Define and document…") and what implements it. */
export interface PartBand {
  /** The part's ID, which the statement implementing it uses as its statement ID. */
  id: string;
  /** The part's text with its label, sub-items and parameters, as the catalog prints it. */
  text: string;
  statement?: Statement;
}

/** A control's implementation laid against its statement, part by part. */
export interface PartMap {
  /** The statement's lead-in before its parts ("The organization:"), if any. */
  lead: string;
  /** Components that implement the whole control rather than one part. */
  whole: ByComponent[];
  /** One per lettered part; a control without parts has one, its whole statement. */
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
  const subParts = statementPart?.parts ?? [];
  const statements = implementation?.statements ?? [];
  const text = (s: string) => insertParams(s, control.params);
  const parts = subParts.length
    ? subParts.map((p) => ({
        id: p.id ?? '',
        text: text(partMarkdown(p).trim()),
      }))
    : [
        {
          id: statementPart?.id ?? `${control.id}_smt`,
          text: text(statementPart?.prose ?? ''),
        },
      ];
  const bands = parts.map((part) => ({
    ...part,
    statement: statements.find((s) => same(s.statementId, part.id)),
  }));
  return {
    lead: subParts.length ? text(statementPart?.prose ?? '') : '',
    whole: implementation?.byComponents ?? [],
    bands,
    others: statements.filter(
      (s) => !bands.some((band) => same(band.id, s.statementId)),
    ),
  };
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
  /** Parts with a component of their own (whole-control components aside), and all the parts. */
  partsCovered: number;
  partsTotal: number;
  /** Components per status, in the order work progresses. */
  statusCounts: { status: StatusKey; count: number }[];
  /** Components without a status. */
  noStatus: number;
  /** The UUIDs of the components that implement any of it, once each. */
  componentUuids: string[];
}

export function implementationSummary(map: PartMap): ImplementationSummary {
  const all = [
    ...map.whole,
    ...map.bands.flatMap((b) => b.statement?.byComponents ?? []),
    ...map.others.flatMap((s) => s.byComponents ?? []),
  ];
  const counts = new Map<StatusKey, number>();
  let noStatus = 0;
  for (const bc of all) {
    const status = implementationStatus(bc);
    if (status) counts.set(status, (counts.get(status) ?? 0) + 1);
    else noStatus += 1;
  }
  return {
    partsCovered: map.bands.filter((b) => b.statement?.byComponents?.length)
      .length,
    partsTotal: map.bands.length,
    statusCounts: STATUS_ORDER.filter((s) => counts.has(s)).map((status) => ({
      status,
      count: counts.get(status)!,
    })),
    noStatus,
    componentUuids: [...new Set(all.map((bc) => bc.componentUuid))],
  };
}
