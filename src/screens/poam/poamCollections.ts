import type { Finding, Observation, POAMItem, Risk } from '@/oscal';
import { RESOURCES } from '@/constants/permissions';
import { formatDate, plural } from '@/ds/format';
import type { CollectionKind } from '../collectionKind';

/**
 * The POA&M record tabs that list one collection of the plan (items, observations, risks,
 * findings), as PoamCollectionTab renders them through RecordCollection. `path` is the API path
 * under the plan and the tab's route path.
 */
export interface PoamCollection extends CollectionKind {
  path: string;
}

const count = (n: number | undefined, noun: string) =>
  n ? [plural(n, noun)] : [];
const date = (iso?: string) => (iso ? formatDate(iso) : '');

export const POAM_COLLECTIONS: Record<string, PoamCollection> = {
  'poam-items': {
    path: 'poam-items',
    noun: 'POA&M item',
    plural: 'POA&M items',
    resource: RESOURCES.POAM_ITEM,
    emptyBody:
      'POA&M items are the weaknesses being tracked, each linked to the findings, observations and risks behind it.',
    editProp: 'item',
    tags: (item: POAMItem) => [
      ...count(item.relatedFindings?.length, 'finding'),
      ...count(item.relatedObservations?.length, 'observation'),
      ...count(item.relatedRisks?.length, 'risk'),
    ],
    // The item details island shows its description and links.
    facts: () => [],
    createForm: () => import('./PoamItemForm.vue'),
    editForm: () => import('./PoamItemForm.vue'),
    designSystemForms: true,
  },
  observations: {
    path: 'observations',
    noun: 'observation',
    plural: 'observations',
    resource: RESOURCES.POAM_OSCAL,
    emptyBody:
      'Observations record what was seen during assessment, and how, as evidence for findings and risks.',
    editProp: 'observation',
    tags: (o: Observation) => [
      ...count(o.methods?.length, 'method'),
      ...count(o.types?.length, 'type'),
      ...count(o.subjects?.length, 'subject'),
    ],
    facts: (o: Observation) => [
      { key: 'description', label: 'Description', value: o.description },
      { key: 'collected', label: 'Collected', value: date(o.collected) },
      { key: 'expires', label: 'Expires', value: date(o.expires) },
    ],
    createForm: () => import('./ObservationForm.vue'),
    editForm: () => import('./ObservationForm.vue'),
    designSystemForms: true,
  },
  risks: {
    path: 'risks',
    noun: 'risk',
    plural: 'risks',
    resource: RESOURCES.RISK,
    emptyBody:
      'Risks describe what could go wrong because of a weakness, and how it is being dealt with.',
    editProp: 'risk',
    tags: (r: Risk) => [
      ...(r.status ? [String(r.status)] : []),
      ...count(r.threatIds?.length, 'threat'),
      ...count(r.characterizations?.length, 'characterization'),
      ...count(r.mitigatingFactors?.length, 'mitigating factor'),
      ...count(r.remediations?.length, 'remediation'),
    ],
    facts: (r: Risk) => [
      { key: 'description', label: 'Description', value: r.description },
      { key: 'statement', label: 'Statement', value: r.statement },
      { key: 'deadline', label: 'Deadline', value: date(r.deadline) },
    ],
    createForm: () => import('@/components/risk/RiskCreateForm.vue'),
    editForm: () => import('@/components/risk/RiskEditForm.vue'),
  },
  findings: {
    path: 'findings',
    noun: 'finding',
    plural: 'findings',
    resource: RESOURCES.POAM_OSCAL,
    emptyBody:
      'Findings are the conclusions of an assessment about a control objective or statement.',
    editProp: 'finding',
    tags: (f: Finding) => [
      ...(f.target?.status?.state ? [f.target.status.state] : []),
      ...count(f.relatedObservations?.length, 'related observation'),
      ...count(f.relatedRisks?.length, 'related risk'),
    ],
    facts: (f: Finding) => [
      { key: 'description', label: 'Description', value: f.description },
      {
        key: 'target',
        label: 'Target',
        value: f.target
          ? [f.target.type, f.target.title || f.target.targetId]
              .filter(Boolean)
              .join(': ')
          : '',
      },
      {
        key: 'implementation',
        label: 'Implementation status',
        value: f.target?.implementationStatus?.state,
      },
      { key: 'remarks', label: 'Remarks', value: f.remarks },
    ],
    createForm: () => import('@/components/poam/FindingCreateForm.vue'),
    editForm: () => import('@/components/poam/FindingEditForm.vue'),
  },
};
