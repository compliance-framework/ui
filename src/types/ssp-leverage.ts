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
  // Optional legacy reference: sharing is decoupled from an Authority to Operate, so links
  // created by subscribe carry none. Only pre-decoupling links reference an LA.
  leveragedAuthUuid?: string;
  satisfaction: SSPLeverageSatisfaction;
  status: SSPLeverageStatus;
  attestedAt?: string;
  attestedById?: string;
  createdAt: string;
  updatedAt: string;
}

// Sharing is decoupled from Leveraged Authorizations: subscribe carries no authorization.
export interface SubscribeRequest {
  downstreamSspId: string;
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
  // The upstream provided capability this link consumes.
  providedUuid: string;
  // The downstream by-component the link's inherited entry hangs off — the anchor for
  // authoring satisfied entries. Absent only if the inherited row was deleted out from
  // under the link.
  byComponentId?: string;
  satisfaction: SSPLeverageSatisfaction;
  status: SSPLeverageStatus;
  // The FULL upstream responsibility set under this link (uuid + description) — the
  // authoritative text for EVERY responsibility, including ones already satisfied. Label
  // responsibilities from this, never from a satisfied entry's "how we handle this" text.
  // Optional so older payloads (before the field shipped) still parse; consumers fall back
  // to outstandingResponsibilities' descriptions.
  responsibilities?: UpstreamResponsibility[];
  // The upstream responsibilities NOT yet covered by a downstream satisfied entry — a subset
  // of `responsibilities`. The FULL set is also the keys of responsibilityPosture.
  outstandingResponsibilities: UpstreamResponsibility[];
  responsibilityPosture: Record<string, ResponsibilityPostureValue>;
  driftRiskId?: string;
}

// GET /oscal/system-security-plans/:id/responsibility-filters — mirrors the API's
// responsibilityFilterResponse exactly. One row per filter attached to an upstream
// responsibility this (downstream) SSP inherits.
export interface ResponsibilityFilter {
  responsibilityUuid: string;
  filterId: string;
  filterName: string;
  controlId?: string;
  // Whether the attachment created (or co-owns) the filter→control link — detaching it
  // may also unlink the control.
  controlLinkCreated: boolean;
}

// POST /api/filters/:id/responsibilities — mirrors attachFilterResponsibilityRequest.
// camelCase (the filters-API convention) — do NOT decamelize.
export interface AttachFilterResponsibilityRequest {
  responsibilityUuid: string;
  sspId: string;
  controlId?: string;
}

// GET /oscal/system-security-plans/:id/shared-responsibility?controlId= — everything this
// SSP provides, inherits and satisfies, anchored on statements. `legacy[]` carries the
// requirement-anchored rows that pre-date the statement anchor: they are shown so a human
// can delete them, never authored against.
//
// These shapes mirror the API's ssp_shared_responsibility.go structs exactly. In particular
// a provides row is ONE by-component with its provided[]/responsibilities[] nested (not one
// row per provided), and no requirement/statement uuids are carried — consumers that need
// the OSCAL uuids must resolve them from the control-implementation tree.
export interface SharedResponsibilityCapability {
  uuid: string;
  description: string;
}

export interface SharedResponsibilityConsumerResponsibility {
  uuid: string;
  description: string;
  providedUuid: string;
}

export interface SharedResponsibilityProvided {
  controlId: string;
  statementId: string;
  byComponentUuid: string;
  componentUuid: string;
  componentTitle: string;
  exportUuid: string;
  provided: SharedResponsibilityCapability[];
  responsibilities: SharedResponsibilityConsumerResponsibility[];
  // True when a *published* offering item already points at one of these provided uuids —
  // i.e. a downstream can actually find and import the capability.
  offered: boolean;
}

export interface SharedResponsibilityInherited {
  controlId: string;
  statementId?: string;
  byComponentUuid: string;
  inheritedUuid: string;
  providedUuid: string;
  upstreamSspId: string;
  upstreamSspTitle: string;
  offeringId: string;
  offeringVersion: number;
  leverageLinkId: string;
  satisfaction: SSPLeverageSatisfaction;
  status: SSPLeverageStatus;
  description: string;
}

export interface SharedResponsibilitySatisfied {
  controlId: string;
  statementId: string;
  byComponentUuid: string;
  satisfiedUuid: string;
  responsibilityUuid: string;
  description: string;
  responsibleRoles?: Array<{ roleId: string; partyUuids?: string[] }>;
}

export interface SharedResponsibilityLegacy {
  controlId: string;
  byComponentUuid: string;
  // "requirement-anchored export" or "requirement-anchored inherited/satisfied" — why the
  // row can't be expressed in the statement-anchored model.
  reason: string;
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

// Statements don't carry a controlId — join implementedRequirementUuid against the
// implementedRequirements list (which includes reused rows for exactly this purpose).
export interface CreatedStatement extends CreatedRecord {
  statementId: string;
  implementedRequirementUuid: string;
}

export interface CreatedByComponent extends CreatedRecord {
  statementUuid: string;
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
