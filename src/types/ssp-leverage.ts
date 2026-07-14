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

// GET /oscal/system-security-plans/:id/shared-responsibility?controlId= — everything this
// SSP provides, inherits and satisfies, anchored on statements. `legacy[]` carries the
// requirement-anchored rows that pre-date the statement anchor: they are shown so a human
// can delete them, never authored against.
export interface SharedResponsibilityProvided {
  controlId: string;
  statementId: string;
  requirementUuid: string;
  statementUuid: string;
  byComponentUuid: string;
  componentUuid: string;
  componentTitle?: string;
  providedUuid: string;
  description: string;
  responsibilities: UpstreamResponsibility[];
}

export interface SharedResponsibilityInherited {
  controlId: string;
  statementId: string;
  byComponentUuid: string;
  componentUuid: string;
  inheritedUuid: string;
  providedUuid: string;
  description: string;
  // The upstream responsibilities that come attached to the inherited capability — the only
  // responsibility-uuids a `satisfied` entry on this statement may reference (anything else
  // is a 400).
  responsibilities: UpstreamResponsibility[];
  leverageLinkId?: string;
  satisfaction?: SSPLeverageSatisfaction;
  status?: SSPLeverageStatus;
  driftRiskId?: string;
}

export interface SharedResponsibilitySatisfied {
  controlId: string;
  statementId: string;
  byComponentUuid: string;
  componentUuid: string;
  satisfiedUuid: string;
  responsibilityUuid: string;
  description: string;
  leverageLinkId?: string;
  status?: SSPLeverageStatus;
  driftRiskId?: string;
}

export interface SharedResponsibilityLegacy {
  controlId: string;
  requirementUuid: string;
  byComponentUuid: string;
  componentUuid: string;
  componentTitle?: string;
  description: string;
  providedCount: number;
  responsibilityCount: number;
}

export interface SharedResponsibilityRollup {
  provides: SharedResponsibilityProvided[];
  inherits: SharedResponsibilityInherited[];
  satisfies: SharedResponsibilitySatisfied[];
  legacy: SharedResponsibilityLegacy[];
}

// POST /oscal/ssp-export-offerings/:id/subscribe returns the leverage links in `data` and,
// alongside them, a `meta.created` block naming the OSCAL rows the subscribe had to create.
// `created: false` means an existing row was reused — don't announce those.
export interface CreatedRecord {
  uuid: string;
  created: boolean;
}

export interface CreatedRequirement extends CreatedRecord {
  controlId: string;
}

export interface CreatedStatement extends CreatedRecord {
  controlId: string;
  statementId: string;
  requirementUuid: string;
}

export interface CreatedByComponent extends CreatedRecord {
  controlId: string;
  statementId?: string;
  componentUuid: string;
}

export interface SubscribeResponseMeta {
  created?: {
    implementedRequirements?: CreatedRequirement[];
    statements?: CreatedStatement[];
    byComponents?: CreatedByComponent[];
  };
}

export interface SubscribeResponse {
  data: SSPLeverageLink[];
  meta?: SubscribeResponseMeta;
}
