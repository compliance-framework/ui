export interface ProfileComplianceStatusCount {
  count: number;
  status: string;
}

/** Where an inherited control's capability comes from (one upstream offering). */
export interface ProfileComplianceLeverageOrigin {
  upstreamSspId: string;
  upstreamSspTitle: string;
  offeringId: string;
  offeringTitle: string;
  offeringVersion: number;
}

/**
 * Cross-SSP leverage overlay on a compliance control (present only when the
 * profile is scoped to an SSP and the control has ≥1 leverage link). `inherited`
 * true means the control earns the `inherited` bucket; drifted/partial links still
 * populate this object so the row can badge them even without posture credit.
 */
export interface ProfileComplianceControlLeverage {
  inherited: boolean;
  satisfaction: 'full' | 'partial';
  status: 'active' | 'drifted' | 'revoked' | 'superseded';
  links: number;
  outstandingCount: number;
  totalResponsibilities: number;
  inheritedFrom: ProfileComplianceLeverageOrigin[];
}

export interface ProfileComplianceControl {
  controlId: string;
  catalogId: string;
  title: string;
  groupId?: string;
  groupTitle?: string;
  implemented?: boolean;
  statusCounts: ProfileComplianceStatusCount[];
  computedStatus: string;
  // Present only when the compliance query is SSP-scoped and this control has
  // leverage links. Optional so older API builds (no leverage) still parse.
  leverage?: ProfileComplianceControlLeverage;
}

export interface ProfileComplianceGroup {
  id: string;
  title: string;
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  // Controls fully guaranteed upstream. Optional: older builds omit it (read `?? 0`).
  inherited?: number;
  compliancePercent: number;
}

export interface ProfileComplianceSummary {
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  // Controls fully guaranteed upstream. Optional: older builds omit it (read `?? 0`).
  inherited?: number;
  compliancePercent: number;
  assessedPercent: number;
  implementedControls?: number;
}

export interface ProfileComplianceImplementation {
  implementedControls: number;
  implementationPercent: number;
  unimplementedControls: number;
}

export interface ProfileComplianceScope {
  type: string;
  id: string;
  title: string;
}

export interface ProfileComplianceProgress {
  scope: ProfileComplianceScope;
  summary: ProfileComplianceSummary;
  implementation?: ProfileComplianceImplementation;
  groups: ProfileComplianceGroup[];
  controls: ProfileComplianceControl[];
}
