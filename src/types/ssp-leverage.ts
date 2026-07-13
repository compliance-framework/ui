// Types for the downstream SSP leverage/subscribe endpoints (BCH-1338). Hand-written,
// camelCase JSON — not OSCAL — so requests must not use decamelizeKeys.

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
