export interface ProfileComplianceStatusCount {
  count: number;
  status: string;
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
}

export interface ProfileComplianceGroup {
  id: string;
  title: string;
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  compliancePercent: number;
}

export interface ProfileComplianceSummary {
  totalControls: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
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
