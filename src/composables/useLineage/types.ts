// Shape of the lineage API nodes (already camelCased by the axios response
// interceptor). Mirrors the PoC API contract in
// lisa-poc-policies-lineage-ui.md §1.

export type LineageNodeType =
  | 'standard-catalog'
  | 'policy-catalog'
  | 'procedure-catalog'
  | 'group'
  | 'control'
  | 'policy-control'
  | 'procedure-control';

export interface LineageCompliance {
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  compliancePercent: number;
  assessedPercent: number;
}

export interface LineageRiskCounts {
  open: number;
  investigating: number;
  mitigatingPlanned: number;
  riskAccepted: number;
  mitigatingImplemented: number;
}

export interface LineageRisk {
  openScoreSum: number;
  mutedScoreSum: number;
  counts: LineageRiskCounts;
}

export interface LineageLinkage {
  policies: number;
  procedures: number;
  operationalControls: number;
  unmapped: boolean;
  unanchored: boolean;
}

export interface LineageNode {
  key: string;
  nodeType: LineageNodeType | string;
  catalogId?: string;
  controlId?: string;
  title: string;
  compliance: LineageCompliance;
  risk: LineageRisk;
  linkage: LineageLinkage;
  hasChildren: boolean;
  childrenCount: number;
}

/** Scope filters shared by tree, graph and dashboard widget. */
export interface LineageScope {
  sspId?: string | null;
  componentId?: string | null;
  /** Root type filter, e.g. ['standard','policy','procedure']. */
  types?: string[];
}

/**
 * PrimeVue-compatible tree node wrapping a {@link LineageNode}. `leaf` is derived
 * from `hasChildren`; `children` is populated lazily on expand. `loading` drives
 * the per-node spinner while its children are fetched.
 */
export interface LineageTreeNode {
  key: string;
  label: string;
  type: string;
  leaf: boolean;
  loading?: boolean;
  data: LineageNode;
  children?: LineageTreeNode[];
}

/** Edge kind between two lineage nodes; drives solid vs dashed rendering. */
export type LineageEdgeKind = 'implements' | 'documents';
