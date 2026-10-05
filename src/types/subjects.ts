import type { SubjectReference } from '@/oscal';

// The kinds of entity evidence can name as its subject (GET /api/subjects).
export type SubjectKind =
  | 'defined-component'
  | 'system-component'
  | 'party'
  | 'user';

export interface SubjectSummary {
  subjectUuid: string;
  // The OSCAL subject type: component, party or user.
  type: string;
  kind: SubjectKind;
  title: string;
  // What the subject belongs to: a defined component's component definition, or a system
  // component's SSP.
  context?: string;
  // A defined component's identity labels.
  identity?: { key: string; value: string }[];
  // The SSP system components a defined component is linked to.
  linkedSsps?: {
    sspId: string;
    sspTitle: string;
    componentId: string;
    componentTitle: string;
  }[];
}

// Namespace of the CCF props on evidence subject references.
export const CCF_OSCAL_NAMESPACE =
  'https://compliance-framework.github.io/ns/oscal';

function ccfPropValue(ref: SubjectReference, name: string) {
  return ref.props?.find(
    (prop) => prop.ns === CCF_OSCAL_NAMESPACE && prop.name === name,
  )?.value;
}

// Where a subject reference came from: template, declared or legacy (ccf:subject-source).
export function subjectSource(ref: SubjectReference) {
  return ccfPropValue(ref, 'subject-source');
}

const SUBJECT_KIND_LABELS: Record<SubjectKind, string> = {
  'defined-component': 'defined component',
  'system-component': 'system component',
  party: 'party',
  user: 'user',
};

// "kind · context", e.g. "system component · Payments Platform".
export function describeSubject(subject: SubjectSummary): string {
  const kind = SUBJECT_KIND_LABELS[subject.kind] ?? subject.kind;
  return subject.context ? `${kind} · ${subject.context}` : kind;
}
