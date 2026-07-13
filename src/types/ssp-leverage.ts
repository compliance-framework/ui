// Types for the downstream SSP leverage/subscribe endpoints (BCH-1338). Hand-written,
// camelCase JSON — not OSCAL — so requests must not use decamelizeKeys.

import type { UpstreamResponsibility } from './ssp-export-offerings';

export type SSPLeverageSatisfaction = 'full' | 'partial';

export type SSPLeverageStatus = 'active' | 'drifted' | 'revoked' | 'superseded';

export interface SSPLeverageLink {
  id: string;
  downstreamSspId: string;
  upstreamSspId: string;
  offeringId: string;
  offeringVersion: number;
  controlId: string;
  statementId?: string;
  providedUuid: string;
  inheritedUuid: string;
  leveragedAuthUuid: string;
  satisfaction: SSPLeverageSatisfaction;
  status: SSPLeverageStatus;
  attestedAt?: string;
  attestedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeRequest {
  downstreamSspId: string;
  leveragedAuthorization: {
    title: string;
    partyUuid: string;
    dateAuthorized?: string;
  };
  items: Array<{
    itemId: string;
    satisfiedResponsibilityUuids?: string[];
  }>;
}

// GET /oscal/system-security-plans/:id/leveraged-controls (BCH-1338/1339/1341/1346).
export type ResponsibilityPostureValue =
  | 'satisfied'
  | 'not-satisfied'
  | 'unknown';

export interface LeveragedControlInheritedFrom {
  upstreamSspId: string;
  offeringId: string;
  offeringTitle: string;
  offeringVersion: number;
}

export interface LeveragedControl {
  id: string;
  controlId: string;
  statementId?: string;
  inheritedFrom: LeveragedControlInheritedFrom;
  satisfaction: SSPLeverageSatisfaction;
  status: SSPLeverageStatus;
  outstandingResponsibilities: UpstreamResponsibility[];
  responsibilityPosture: Record<string, ResponsibilityPostureValue>;
  driftRiskId?: string;
}
