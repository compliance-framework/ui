import type { BackMatterResource, Base64, Link, Property } from '@/oscal';
import type { Evidence, EvidenceLabel } from '@/stores/evidence';

/**
 * The evidence form's model and rules, shared by New evidence and Re-submit. Dates are edited as
 * local calendar dates (YYYY-MM-DD) and sent as ISO instants at local midnight, as the classic
 * form's date pickers did.
 */
export interface EvidenceDraft {
  uuid: string;
  title: string;
  description: string;
  state: string;
  reason: string;
  start: string;
  end: string;
  expires: string;
  labels: EvidenceLabel[];
  props: Property[];
  links: Link[];
  resources: BackMatterResource[];
  subjects: { subjectUuid: string; title: string }[];
}

export const STATUS_OPTIONS = [
  { value: 'satisfied', label: 'Satisfied' },
  { value: 'not-satisfied', label: 'Not satisfied' },
  { value: 'in-progress', label: 'In progress' },
];

/** The local calendar date of an ISO instant, for a date input. */
export function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a calendar date, as an ISO instant. */
export function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** A draft from an existing record (Re-submit keeps its stream UUID) or a new, empty one. */
export function draftFrom(
  evidence: Partial<Evidence> | undefined,
  newUuid: () => string,
): EvidenceDraft {
  return {
    uuid: evidence?.uuid || newUuid(),
    title: evidence?.title ?? '',
    description: evidence?.description ?? '',
    state: evidence?.status?.state ?? '',
    reason: evidence?.status?.reason ?? '',
    start: toDateInput(evidence?.start),
    end: toDateInput(evidence?.end),
    expires: toDateInput(evidence?.expires),
    labels: (evidence?.labels ?? []).map((label) => ({ ...label })),
    props: (evidence?.props ?? []).map((prop) => ({ ...prop })),
    links: (evidence?.links ?? []).map((link) => ({ ...link })),
    resources: [],
    subjects: [],
  };
}

/** Why the collection window is invalid, or undefined. Dates compare as calendar days. */
export function dateError(
  draft: EvidenceDraft,
  today: string,
): string | undefined {
  if (!draft.start || !draft.end) return undefined;
  if (draft.end > today) return 'The end date can’t be in the future.';
  if (draft.start > draft.end)
    return 'The end date must be on or after the start date.';
  if (draft.expires && draft.expires < draft.end)
    return 'The expiry date must be on or after the end date.';
  return undefined;
}

/** Field errors for the draft, keyed by field; empty when it can be submitted. */
export function validate(
  draft: EvidenceDraft,
  options: { subjectRequired: boolean; today: string },
): Partial<
  Record<'title' | 'state' | 'start' | 'end' | 'subjects' | 'dates', string>
> {
  const errors: ReturnType<typeof validate> = {};
  if (!draft.title.trim()) errors.title = 'Enter a title.';
  if (!draft.state) errors.state = 'Choose a status.';
  if (!draft.start) errors.start = 'Choose the start date.';
  if (!draft.end) errors.end = 'Choose the end date.';
  if (options.subjectRequired && draft.subjects.length === 0)
    errors.subjects = 'Choose at least one subject.';
  const dates = dateError(draft, options.today);
  if (dates) errors.dates = dates;
  return errors;
}

/** An uploaded file as a back-matter resource, plus the link that references it. */
export function attach(
  file: File,
  base64: Base64,
  id: string,
): { resource: BackMatterResource; link: Link } {
  return {
    resource: { uuid: id, title: file.name, description: '', base64 },
    link: { href: `#${id}`, rel: 'reference', text: file.name },
  };
}

/** The POST /api/evidence body (before kebab-casing), as the classic form sent it. */
export function payload(draft: EvidenceDraft): Record<string, unknown> {
  return {
    uuid: draft.uuid,
    title: draft.title.trim(),
    description: draft.description,
    start: fromDateInput(draft.start),
    end: fromDateInput(draft.end),
    expires: fromDateInput(draft.expires),
    status: { state: draft.state, reason: draft.reason },
    labels: Object.fromEntries(
      draft.labels
        .filter((label) => label.name.trim())
        .map((label) => [label.name.trim(), label.value]),
    ),
    props: draft.props.filter((prop) => prop.name || prop.value),
    links: draft.links.filter((link) => link.href),
    // The chosen subjects replace any on the evidence being re-submitted.
    subjects: draft.subjects.map(({ subjectUuid }) => ({ subjectUuid })),
    backMatter: { resources: draft.resources },
  };
}

/** Reads a file as base64, the way the classic upload did. */
export function readBase64(file: File): Promise<Base64> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        filename: file.name,
        mediaType: file.type,
        value: String(reader.result).split(',')[1] ?? '',
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
