import type { RouteLocationRaw } from 'vue-router';
import { CATALOG_TYPE_NS, type CatalogType } from '@/composables/catalog';
import { RESOURCES } from '@/constants/permissions';
import { useSystemStore } from '@/stores/system';
import type { SystemSecurityPlan } from '@/oscal';

/**
 * Create and edit forms for OSCAL documents whose classic pages only edited metadata: systems,
 * catalogs, component definitions and profiles (create only), assessment plans and POA&Ms. Each
 * kind says where it lives, what a new one starts as, and which extra fields it has. Keyed by
 * kind; `FORM_ROUTES` maps route names.
 */
export interface DocumentFormKind {
  /** Singular noun, e.g. "assessment plan". */
  noun: string;
  endpoint: string;
  /** Where a document opens, after saving and as edit's "back". */
  detail: (id: string) => RouteLocationRaw;
  listRoute: string;
  listLabel: string;
  resource: string;
  /** A new document before the form's fields are applied. */
  blank: () => Record<string, unknown>;
  version: boolean;
  versionRequired?: boolean;
  /** Edit shows the published date (assessment plans). */
  published?: boolean;
  /** The SSP an assessment plan imports: a required URL, with remarks. */
  importSsp?: boolean;
  /** A catalog's type, stored as a metadata prop. */
  catalogType?: boolean;
  /** Runs after a successful create, e.g. making a new system the current one. */
  created?: (doc: Record<string, unknown>) => void;
}

export const CATALOG_TYPE_OPTIONS: { value: CatalogType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'policy', label: 'Policy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'internal', label: 'Internal catalog' },
  { value: 'other', label: 'Other' },
];

/**
 * The backend derives a catalog's type from a `catalog-type` metadata prop; no prop means
 * `standard`, so it's only stamped for the other types.
 */
export function withCatalogType(
  props: { name: string; ns?: string; value: string }[] | undefined,
  type: string,
) {
  const kept = (props ?? []).filter(
    (p) => !(p.name === 'catalog-type' && p.ns === CATALOG_TYPE_NS),
  );
  if (type !== 'standard')
    kept.push({ name: 'catalog-type', ns: CATALOG_TYPE_NS, value: type });
  return kept.length ? kept : undefined;
}

export const DOCUMENT_FORMS: Record<string, DocumentFormKind> = {
  system: {
    noun: 'system',
    endpoint: '/api/oscal/system-security-plans',
    detail: (id) => ({ name: 'system-configure', params: { systemId: id } }),
    listRoute: 'systems',
    listLabel: 'Systems',
    resource: RESOURCES.SSP,
    blank: () => ({ metadata: { version: '1.0.0' } }),
    version: true,
    versionRequired: true,
    // A new system is almost always the one the user works on next.
    created: (doc) => {
      const store = useSystemStore();
      const plan = doc as unknown as SystemSecurityPlan;
      if (store.availablePlansLoaded)
        store.setAvailablePlans([...store.availablePlans, plan]);
      store.setSecurityPlan(plan);
    },
  },
  catalog: {
    noun: 'catalog',
    endpoint: '/api/oscal/catalogs',
    detail: (id) => ({ name: 'catalog-view', params: { id } }),
    listRoute: 'catalog-list',
    listLabel: 'Catalogs',
    resource: RESOURCES.CATALOG,
    blank: () => ({ metadata: {} }),
    version: true,
    catalogType: true,
  },
  'component-definition': {
    noun: 'component definition',
    endpoint: '/api/oscal/component-definitions',
    detail: (id) => ({ name: 'component-definition-overview', params: { id } }),
    listRoute: 'component-definitions',
    listLabel: 'Component definitions',
    resource: RESOURCES.COMPONENT_DEFINITION,
    blank: () => ({ metadata: {} }),
    version: true,
  },
  profile: {
    noun: 'profile',
    endpoint: '/api/oscal/profiles',
    detail: (id) => ({ name: 'profile:view-controls', params: { id } }),
    listRoute: 'profile-list',
    listLabel: 'Profiles',
    resource: RESOURCES.PROFILE,
    blank: () => ({
      metadata: {},
      merge: { asIs: true },
      imports: [],
      modify: { setParameters: [], alters: [] },
      backMatter: { resources: [] },
    }),
    version: false,
  },
  'assessment-plan': {
    noun: 'assessment plan',
    endpoint: '/api/oscal/assessment-plans',
    detail: (id) => ({ name: 'assessment-plan-overview', params: { id } }),
    listRoute: 'assessment-plans',
    listLabel: 'Assessment plans',
    resource: RESOURCES.ASSESSMENT_PLAN,
    blank: () => ({ metadata: { version: '1.0' }, importSsp: {} }),
    version: true,
    published: true,
    importSsp: true,
  },
  poam: {
    noun: 'POA&M',
    endpoint: '/api/oscal/plan-of-action-and-milestones',
    detail: (id) => ({
      name: 'plan-of-action-and-milestones-overview',
      params: { id },
    }),
    listRoute: 'plan-of-action-and-milestones',
    listLabel: 'POA&Ms',
    resource: RESOURCES.POAM_OSCAL,
    // The API requires a system ID; the classic form sent this placeholder too.
    blank: () => ({
      metadata: {},
      systemId: { id: 'change-me', identifierType: '' },
      poamItems: [],
    }),
    version: true,
  },
};

export const FORM_ROUTES: Record<
  string,
  { kind: keyof typeof DOCUMENT_FORMS; mode: 'create' | 'edit' }
> = {
  'system-security-plans-create': { kind: 'system', mode: 'create' },
  'catalog-create': { kind: 'catalog', mode: 'create' },
  'component-definition-create': {
    kind: 'component-definition',
    mode: 'create',
  },
  'profile:create': { kind: 'profile', mode: 'create' },
  'assessment-plan-create': { kind: 'assessment-plan', mode: 'create' },
  'assessment-plan-edit': { kind: 'assessment-plan', mode: 'edit' },
  'plan-of-action-and-milestones-create': { kind: 'poam', mode: 'create' },
  'plan-of-action-and-milestones-edit': { kind: 'poam', mode: 'edit' },
};

/** Field rules shared by create and edit. */
export function validateDocument(
  kind: DocumentFormKind,
  fields: {
    uuid: string;
    title: string;
    version: string;
    importSspHref: string;
  },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.uuid.trim()) errors.uuid = 'Enter an ID, or generate one.';
  if (!fields.title.trim()) errors.title = 'Enter a title.';
  if (kind.versionRequired && !fields.version.trim())
    errors.version = 'Enter a version, like 1.0.0.';
  if (kind.importSsp) {
    const href = fields.importSspHref.trim();
    if (!href)
      errors.importSspHref = 'Enter the URL of the system security plan.';
    else {
      try {
        new URL(href);
      } catch {
        errors.importSspHref =
          'Enter a full URL, like https://example.com/ssp.json.';
      }
    }
  }
  return errors;
}
