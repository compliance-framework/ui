// Types for the SSP export offering endpoints (BCH-1337). These are
// hand-written, camelCase JSON API resources — not OSCAL — so they live here
// rather than in src/oscal, and requests must not use decamelizeKeys.

export type SSPExportOfferingStatus =
  | 'draft'
  | 'published'
  | 'deprecated'
  | 'revoked';

export interface SSPExportOfferingItem {
  id: string;
  offeringId: string;
  controlId: string;
  statementId?: string;
  componentUuid: string;
  providedUuid: string;
}

export interface SSPExportOffering {
  id: string;
  sspId: string;
  title: string;
  description: string;
  version: number;
  status: SSPExportOfferingStatus;
  contentHash: string;
  publishedAt?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  items?: SSPExportOfferingItem[];
}

// The flat, cross-SSP catalog (GET /oscal/ssp-export-offerings) resolves each item's
// upstream responsibilities server-side, but deliberately omits any upstream SSP
// title/metadata — only a bare sspId. Do not join anything UPSTREAM-SCOPED onto it (that
// would require ssp:read on the upstream SSP, the trust boundary BCH-1345 must not cross);
// resolving a friendly title best-effort from the permission-filtered SSP *list* the caller
// can already read (as the allow-list dialog does) is fine — it degrades to the bare id.
export interface UpstreamResponsibility {
  responsibilityUuid: string;
  description: string;
}

export interface CatalogOfferingItem extends SSPExportOfferingItem {
  responsibilities: UpstreamResponsibility[];
}

export interface CatalogOffering extends Omit<SSPExportOffering, 'items'> {
  items?: CatalogOfferingItem[];
}

// One entry of an offering's downstream allow-list
// (GET/POST/DELETE .../export-offerings/:offeringId/allowed-downstreams). An empty list
// means "any downstream may subscribe" — the API only enforces the list when it is
// non-empty.
export interface AllowedDownstream {
  id: string;
  offeringId: string;
  downstreamSspId: string;
  createdAt?: string;
}

// GET /oscal/ssp-export-offerings/by-control/:controlId?downstreamSspId= — what upstream
// SSPs export for one control. Same trust boundary as the flat catalog: the upstream SSP is
// identified only by the id/title the offering itself carries, and nothing here is joined
// against an upstream-scoped endpoint.
//
// Mirrors the API's ControlExportOffer struct exactly: the provided capability is nested
// (and nullable), and the responsibility rows use `uuid`, unlike the flat catalog's
// `responsibilityUuid`.
export interface ControlExportOfferProvided {
  uuid: string;
  description: string;
}

export interface ControlExportOfferResponsibility {
  uuid: string;
  description: string;
  providedUuid: string;
}

export interface ControlExportOffer {
  offeringId: string;
  offeringTitle: string;
  offeringVersion: number;
  offeringStatus: SSPExportOfferingStatus;
  upstreamSspId: string;
  upstreamSspTitle: string;
  itemId: string;
  controlId: string;
  statementId?: string;
  componentUuid: string;
  componentTitle: string;
  provided: ControlExportOfferProvided | null;
  responsibilities: ControlExportOfferResponsibility[];
}
