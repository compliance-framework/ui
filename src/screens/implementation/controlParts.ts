import type {
  ByComponent,
  Control,
  ImplementedRequirement,
  Statement,
} from '@/oscal';
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
  ): Omit<PartBand, 'statement'>[] =>
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
  const bands = parts.map((part) => ({
    ...part,
    statement: statements.find((s) => same(s.statementId, part.id)),
  }));
  return {
    lead: outline.length ? text(statementPart?.prose ?? '') : '',
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
  /**
   * Each component that implements any of it, once, in the order first met, with its statuses
   * across the parts in the order work progresses (none when it has no status).
   */
  components: { uuid: string; statuses: StatusKey[] }[];
}

export function implementationSummary(map: PartMap): ImplementationSummary {
  const all = [
    ...map.whole,
    ...map.bands.flatMap((b) => b.statement?.byComponents ?? []),
    ...map.others.flatMap((s) => s.byComponents ?? []),
  ];
  const statuses = new Map<string, Set<StatusKey>>();
  for (const bc of all) {
    const found = statuses.get(bc.componentUuid) ?? new Set<StatusKey>();
    const status = implementationStatus(bc);
    if (status) found.add(status);
    statuses.set(bc.componentUuid, found);
  }
  return {
    partsCovered: map.bands.filter((b) => b.statement?.byComponents?.length)
      .length,
    partsTotal: map.bands.length,
    components: [...statuses].map(([uuid, found]) => ({
      uuid,
      statuses: STATUS_ORDER.filter((s) => found.has(s)),
    })),
  };
}

/**
 * The start of a control's statement, for a list row: its lead-in, or its first part, with
 * parameters written out, cut at about `max` characters on a word.
 */
export function statementExcerpt(control: Control, max = 160): string {
  const map = partMap(control, undefined);
  const text = (map.lead || map.bands[0]?.text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max)}…`;
}

/** An implementation status's pill colour: green when implemented, amber when partial, else blue. */
export function implementationTone(status: StatusKey): StatusTone {
  if (status === 'implemented') return 'success';
  if (status === 'partial') return 'warning';
  return 'info';
}
