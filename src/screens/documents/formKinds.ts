import { RESOURCES } from '@/constants/permissions';

/**
 * Create and edit forms for OSCAL documents whose classic pages only edited metadata: component
 * definitions and profiles (create only), assessment plans and POA&Ms. Each kind says where it lives, what a new
 * one starts as, and which extra fields it has. Keyed by kind; `FORM_ROUTES` maps route names.
 */
export interface DocumentFormKind {
  /** Singular noun, e.g. "assessment plan". */
  noun: string;
  endpoint: string;
  detailRoute: string;
  listRoute: string;
  listLabel: string;
  resource: string;
  /** A new document before the form's fields are applied. */
  blank: () => Record<string, unknown>;
  version: boolean;
  /** Edit shows the published date (assessment plans). */
  published?: boolean;
  /** The SSP an assessment plan imports: a required URL, with remarks. */
  importSsp?: boolean;
}

export const DOCUMENT_FORMS: Record<string, DocumentFormKind> = {
  'component-definition': {
    noun: 'component definition',
    endpoint: '/api/oscal/component-definitions',
    detailRoute: 'component-definition-overview',
    listRoute: 'component-definitions',
    listLabel: 'Component definitions',
    resource: RESOURCES.COMPONENT_DEFINITION,
    blank: () => ({ metadata: {} }),
    version: true,
  },
  profile: {
    noun: 'profile',
    endpoint: '/api/oscal/profiles',
    detailRoute: 'profile:view-controls',
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
    detailRoute: 'assessment-plan-overview',
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
    detailRoute: 'plan-of-action-and-milestones-overview',
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
  fields: { title: string; importSspHref: string },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.title.trim()) errors.title = 'Enter a title.';
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
