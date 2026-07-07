// Typed directed edges between two controls (source -> target), backing the
// Policies & Procedures + Compliance Lineage APIs (GET/POST/DELETE
// /api/control-links). The composite primary key is
// (sourceCatalogId, sourceControlId, targetCatalogId, targetControlId,
// relationshipType) — there is no surrogate id — so a link is identified and
// deleted by all five fields. This is a hand-written camelCase API, so payloads
// are NOT run through decamelizeKeys.

// A control node reference: which catalog, which control within it.
export interface ControlRef {
  catalogId: string;
  controlId: string;
}

// The stored edge as returned by the list/create endpoints.
export interface ControlLink {
  sourceCatalogId: string;
  sourceControlId: string;
  targetCatalogId: string;
  targetControlId: string;
  relationshipType: string;
  createdAt?: string;
  createdById?: string | null;
}

// POST /api/control-links body shape.
export interface CreateControlLinkRequest {
  source: ControlRef;
  target: ControlRef;
  relationshipType: string;
}

// Catalog-level convenience API (/api/control-links/catalog): links a whole
// source catalog to a single target control, fanning out to one control_links
// row per control in the source catalog. Direction is always
// source-catalog -> target-control.
export interface CatalogLinkRequest {
  sourceCatalogId: string;
  target: ControlRef;
  relationshipType: string;
}

// One aggregated catalog-level link as returned by GET /api/control-links/catalog:
// a group of underlying control_links sharing (source catalog, target control,
// relationship), with the number of fanned-out rows.
export interface CatalogLinkSummary {
  sourceCatalogId: string;
  targetCatalogId: string;
  targetControlId: string;
  relationshipType: string;
  controlCount: number;
}

// POST/PUT/DELETE /api/control-links/catalog result envelope. `deleted` is only
// present for PUT (re-sync) and DELETE.
export interface CatalogLinkResult {
  created: number;
  skipped: number;
  deleted?: number;
}

export const RELATIONSHIP_IMPLEMENTS = 'implements';
export const RELATIONSHIP_DOCUMENTS = 'documents';

// The only relationship types the API accepts today. related/supersedes/
// equivalent are reserved server-side and rejected on create, so they are not
// offered here. `hint` documents the allowed endpoint-type direction matrix
// (direction is concrete -> abstract) that the API validates (422 on violation).
export interface RelationshipOption {
  label: string;
  value: string;
  hint: string;
}

export const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  {
    label: 'Implements',
    value: RELATIONSHIP_IMPLEMENTS,
    hint: 'policy → standard, operational → policy, or operational → standard',
  },
  {
    label: 'Documents',
    value: RELATIONSHIP_DOCUMENTS,
    hint: 'procedure → policy',
  },
];
