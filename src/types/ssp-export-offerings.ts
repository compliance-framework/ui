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
// title/metadata — only a bare sspId. Never resolve that into a friendly name (would
// require ssp:read on the upstream SSP, the exact trust boundary BCH-1345 must not cross).
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
