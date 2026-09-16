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
  | 'procedure-control'
  | 'risk'
  | 'evidence';

export interface LineageCompliance {
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  // Controls fully guaranteed by an upstream SSP. `compliancePercent` counts these
  // as compliant, `assessedPercent` as assessed. Optional: older builds omit it.
  inherited?: number;
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

/**
 * How a single operational control is handled within the selected SSP. `posture`
 * is the derived verdict the UI switches on; the raw inputs are carried alongside
 * so the row can explain itself in a tooltip.
 */
export type LineagePosture =
  | 'out-of-scope'
  | 'satisfied'
  | 'not-satisfied'
  | 'inherited'
  | 'not-applicable'
  | 'planned'
  | 'attention';

/**
 * Compact leverage summary carried on a control's single-SSP overlay (present
 * whenever ≥1 leverage link exists, whether or not it earns the `inherited`
 * posture). Drives the "Inherited"/"Inherited · drifted" badge. Values are
 * strings to tolerate future statuses without a type bump.
 */
export interface LineageLeverageSummary {
  links: number;
  status: string;
  satisfaction: string;
  outstandingCount: number;
  totalResponsibilities: number;
}

export interface LineageSSPStatus {
  posture: LineagePosture | string;
  inProfile: boolean;
  /** 'satisfied' | 'not-satisfied' | 'unknown'. */
  evidenceStatus: string;
  /** Uniform implementation status, or '' when undeclared/mixed. */
  implementationStatus?: string;
  /** Present whenever ≥1 leverage link exists (credit or not). */
  leverage?: LineageLeverageSummary;
}

/** Tally of a structural node's own controls' postures in the selected SSP. */
export interface LineagePostureCounts {
  satisfied: number;
  notSatisfied: number;
  notApplicable: number;
  planned: number;
  attention: number;
  outOfScope: number;
  /** Controls fully inherited from upstream. Optional: older builds omit it. */
  inherited?: number;
}

/** One row of the drawer's per-SSP table for a control (GET /nodes/:key/ssps). */
export interface LineageSSPRow {
  sspId: string;
  sspTitle: string;
  inProfile: boolean;
  posture: LineagePosture | string;
  /** 'satisfied' | 'not-satisfied' | 'unknown'. */
  evidenceStatus: string;
  /** Declared implementation status, or '' when undeclared/mixed. */
  implementationStatus?: string;
  /** Present whenever ≥1 leverage link exists (credit or not). */
  leverage?: LineageLeverageSummary;
}

/** Cross-SSP posture breakdown for a control in the global (no-SSP) view. */
export interface LineageSSPBreakdown {
  totalSsps: number;
  outOfScope: number;
  satisfied: number;
  notSatisfied: number;
  notApplicable: number;
  planned: number;
  attention: number;
  /** Controls fully inherited from upstream. Optional: older builds omit it. */
  inherited?: number;
}

// --- Contract C: GET /api/lineage/nodes/:key/leverage (drawer detail) ---------

export interface LineageLeverageInheritedFrom {
  upstreamSspId: string;
  upstreamSspTitle: string;
  offeringId: string;
  offeringTitle: string;
  offeringVersion: number;
}

/**
 * One leverage link, byte-for-byte the `leveragedControlResponse` projection plus
 * `upstreamSspTitle` inside `inheritedFrom`. `responsibilityPosture` is UUID-keyed —
 * it MUST be fenced from the axios camelCase interceptor.
 */
export interface LineageLeverageLink {
  id: string;
  controlId: string;
  statementId?: string;
  inheritedFrom: LineageLeverageInheritedFrom;
  providedUuid: string;
  byComponentId?: string;
  satisfaction: 'full' | 'partial';
  status: 'active' | 'drifted' | 'revoked' | 'superseded';
  responsibilities: { responsibilityUuid: string; description: string }[];
  outstandingResponsibilities: {
    responsibilityUuid: string;
    description: string;
  }[];
  responsibilityPosture: Record<
    string,
    'satisfied' | 'not-satisfied' | 'unknown'
  >;
  driftRiskId?: string;
}

/** One downstream SSP's leverage links for a control (drawer detail rows). */
export interface LineageLeverageRow {
  sspId: string;
  sspTitle: string;
  links: LineageLeverageLink[];
}

export interface LineageNode {
  key: string;
  nodeType: LineageNodeType | string;
  catalogId?: string;
  controlId?: string;
  groupId?: string;
  title: string;
  /** OSCAL control statement prose (control nodes only); shown on hover. */
  statement?: string;
  compliance: LineageCompliance;
  risk: LineageRisk;
  linkage: LineageLinkage;

  /** SSP-scoped posture overlay on operational control nodes (sspId set). */
  ssp?: LineageSSPStatus;
  /** Posture tally on structural nodes (sspId set). */
  postureCounts?: LineagePostureCounts;
  /** Cross-SSP breakdown on operational control nodes (no sspId). */
  sspBreakdown?: LineageSSPBreakdown;

  hasChildren: boolean;
  childrenCount: number;

  // How this node links to its parent, e.g. 'has-risk' | 'has-evidence'.
  relationship?: string;

  // --- risk nodes (nodeType === 'risk') ---
  riskId?: string;
  /** Risk score (also mirrored in `risk.openScoreSum` while the risk is open). */
  score?: number;
  /** Severity label, e.g. 'low' | 'moderate' | 'high' | 'critical'. */
  severity?: string;
  likelihood?: string;
  impact?: string;
  linkedEvidenceCount?: number;
  reviewDeadline?: string;
  lastReviewedAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  /** The single SSP this risk belongs to (risks always have exactly one). */
  sspId?: string;
  sspTitle?: string;

  // --- evidence nodes (nodeType === 'evidence') ---
  evidenceId?: string;
  /** Reason / rationale for the evidence state. */
  reason?: string;
  collectedAt?: string;
  expires?: string;

  // `status` is shared: risk status ('open', …) OR evidence state ('not-satisfied', …).
  status?: string;
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
